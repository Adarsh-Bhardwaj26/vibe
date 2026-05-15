const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');

// ─── Dashboard Stats ──────────────────────────────────────────────────────────
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalPosts, reportedPosts, activeUsers] = await Promise.all([
    User.countDocuments(),
    Post.countDocuments({ isDeleted: false }),
    Post.countDocuments({ reportedBy: { $exists: true, $not: { $size: 0 } }, isDeleted: false }),
    User.countDocuments({ isActive: true }),
  ]);

  res.status(200).json({
    success: true,
    stats: { totalUsers, totalPosts, reportedPosts, activeUsers },
  });
});

// ─── Manage Users ─────────────────────────────────────────────────────────────
exports.getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '' } = req.query;
  const skip = (page - 1) * limit;

  const filter = search
    ? { $or: [{ username: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};

  const users = await User.find(filter)
    .select('-password -refreshToken')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const total = await User.countDocuments(filter);

  res.status(200).json({
    success: true,
    users,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// ─── Toggle User Active Status ────────────────────────────────────────────────
exports.toggleUserStatus = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.userId);
  if (!user) throw new AppError('User not found.', 404);
  if (user.role === 'admin') throw new AppError('Cannot deactivate an admin.', 403);

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `User ${user.isActive ? 'activated' : 'deactivated'}.`,
    isActive: user.isActive,
  });
});

// ─── Get Reported Posts ───────────────────────────────────────────────────────
exports.getReportedPosts = asyncHandler(async (req, res) => {
  const posts = await Post.find({
    reportedBy: { $exists: true, $not: { $size: 0 } },
    isDeleted: false,
  })
    .populate('author', 'username email avatar')
    .populate('reportedBy', 'username')
    .sort({ 'reportedBy.length': -1, createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, posts });
});

// ─── Force Delete Post ────────────────────────────────────────────────────────
exports.adminDeletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.postId);
  if (!post) throw new AppError('Post not found.', 404);

  post.isDeleted = true;
  await post.save();

  res.status(200).json({ success: true, message: 'Post removed by admin.' });
});
