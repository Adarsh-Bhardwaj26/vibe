const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryHelper');

// ─── Get User Profile ─────────────────────────────────────────────────────────
exports.getUserProfile = asyncHandler(async (req, res, next) => {
  const { username } = req.params;

  const user = await User.findOne({ username: username.toLowerCase() })
    .populate('followers', 'username fullName avatar isVerified')
    .populate('following', 'username fullName avatar isVerified')
    .select('-password -refreshToken -verificationToken -resetPasswordToken');

  if (!user) throw new AppError('User not found.', 404);

  const postsCount = await Post.countDocuments({ author: user._id, isDeleted: false });

  res.status(200).json({ success: true, user: { ...user.toObject(), postsCount } });
});

// ─── Update Profile ───────────────────────────────────────────────────────────
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { fullName, bio, website, location, socialLinks } = req.body;

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (bio !== undefined) updateData.bio = bio;
  if (website !== undefined) updateData.website = website;
  if (location !== undefined) updateData.location = location;
  if (socialLinks) updateData.socialLinks = socialLinks;

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  }).select('-password -refreshToken');

  res.status(200).json({ success: true, message: 'Profile updated.', user });
});

// ─── Update Avatar ────────────────────────────────────────────────────────────
exports.updateAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) throw new AppError('Please upload an image.', 400);

  const user = await User.findById(req.user._id);

  // Delete old avatar from Cloudinary
  if (user.avatar?.publicId) {
    await deleteFromCloudinary(user.avatar.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, 'avatars', 'image');

  user.avatar = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Avatar updated.',
    avatar: user.avatar,
  });
});

// ─── Update Cover Image ───────────────────────────────────────────────────────
exports.updateCoverImage = asyncHandler(async (req, res, next) => {
  if (!req.file) throw new AppError('Please upload an image.', 400);

  const user = await User.findById(req.user._id);

  if (user.coverImage?.publicId) {
    await deleteFromCloudinary(user.coverImage.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, 'covers', 'image');

  user.coverImage = { url: result.secure_url, publicId: result.public_id };
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Cover image updated.',
    coverImage: user.coverImage,
  });
});

// ─── Follow / Unfollow ────────────────────────────────────────────────────────
exports.toggleFollow = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  if (userId === req.user._id.toString()) throw new AppError("You can't follow yourself.", 400);

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError('User not found.', 404);

  const isFollowing = req.user.followers?.includes(userId) || targetUser.followers.includes(req.user._id);
  const currentUser = await User.findById(req.user._id);
  const alreadyFollowing = currentUser.following.includes(userId);

  if (alreadyFollowing) {
    // Unfollow
    await User.findByIdAndUpdate(req.user._id, { $pull: { following: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { followers: req.user._id } });
    return res.status(200).json({ success: true, message: 'Unfollowed.', isFollowing: false });
  } else {
    // Follow
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: userId } });
    await User.findByIdAndUpdate(userId, { $addToSet: { followers: req.user._id } });

    // Create notification
    await Notification.create({
      recipient: userId,
      sender: req.user._id,
      type: 'follow',
      text: `${req.user.username} started following you.`,
      link: `/profile/${req.user.username}`,
    });

    // Emit socket event (global io is set in server.js)
    if (global.io) {
      global.io.to(userId).emit('notification', {
        type: 'follow',
        sender: { username: req.user.username, avatar: req.user.avatar },
        message: `${req.user.username} started following you.`,
      });
    }

    return res.status(200).json({ success: true, message: 'Followed.', isFollowing: true });
  }
});

// ─── Search Users ─────────────────────────────────────────────────────────────
exports.searchUsers = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  if (!q) throw new AppError('Search query is required.', 400);

  const skip = (page - 1) * limit;
  const query = {
    $or: [
      { username: { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } },
    ],
    isActive: true,
  };

  const users = await User.find(query)
    .select('username fullName avatar bio isVerified followers')
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    users,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// ─── Get Suggested Users ──────────────────────────────────────────────────────
exports.getSuggestedUsers = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id);
  const alreadyFollowing = currentUser.following;

  const users = await User.find({
    _id: { $ne: req.user._id, $nin: alreadyFollowing },
    isActive: true,
  })
    .select('username fullName avatar bio isVerified followers')
    .limit(10)
    .lean();

  // Sort by follower count
  users.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));

  res.status(200).json({ success: true, users: users.slice(0, 5) });
});

// ─── Get Followers / Following ─────────────────────────────────────────────────
exports.getFollowers = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).populate('followers', 'username fullName avatar bio isVerified');
  if (!user) throw new AppError('User not found.', 404);
  res.status(200).json({ success: true, followers: user.followers });
});

exports.getFollowing = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).populate('following', 'username fullName avatar bio isVerified');
  if (!user) throw new AppError('User not found.', 404);
  res.status(200).json({ success: true, following: user.following });
});

// ─── Change Password ──────────────────────────────────────────────────────────
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isCorrect = await user.comparePassword(currentPassword);
  if (!isCorrect) throw new AppError('Current password is incorrect.', 401);

  if (newPassword.length < 6) throw new AppError('New password must be at least 6 characters.', 400);

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: 'Password changed successfully.' });
});
