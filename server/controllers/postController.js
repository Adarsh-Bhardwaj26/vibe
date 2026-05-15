const asyncHandler = require('express-async-handler');
const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinaryHelper');
const { moderateContent } = require('../services/aiService');

// ─── Create Post ──────────────────────────────────────────────────────────────
exports.createPost = asyncHandler(async (req, res, next) => {
  const { caption, location } = req.body;

  if (!req.files?.length && !caption?.trim()) {
    throw new AppError('Post must have media or a caption.', 400);
  }

  if (caption?.trim()) {
    const moderation = await moderateContent(caption);
    if (moderation.isToxic) {
      throw new AppError('Your post was flagged by AI for violating community guidelines regarding toxicity or explicit content.', 403);
    }
  }

  let mediaArray = [];

  if (req.files?.length) {
    const uploadPromises = req.files.map(async (file) => {
      const isVideo = file.mimetype.startsWith('video/');
      const result = await uploadToCloudinary(file.buffer, 'posts', isVideo ? 'video' : 'image');
      return {
        url: result.secure_url,
        publicId: result.public_id,
        type: isVideo ? 'video' : 'image',
        width: result.width,
        height: result.height,
      };
    });
    mediaArray = await Promise.all(uploadPromises);
  }

  const post = await Post.create({
    author: req.user._id,
    caption: caption || '',
    media: mediaArray,
    location: location || '',
  });

  // Increment post count
  await User.findByIdAndUpdate(req.user._id, { $inc: { postsCount: 1 } });

  const populated = await post.populate('author', 'username fullName avatar isVerified');

  res.status(201).json({ success: true, message: 'Post created.', post: populated });
});

// ─── Get Feed Posts ───────────────────────────────────────────────────────────
exports.getFeedPosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const currentUser = await User.findById(req.user._id);
  const followingIds = [...currentUser.following, req.user._id];

  const posts = await Post.find({
    author: { $in: followingIds },
    isDeleted: false,
    isPublic: true,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('author', 'username fullName avatar isVerified')
    .populate('comments.user', 'username avatar')
    .lean();

  const total = await Post.countDocuments({
    author: { $in: followingIds },
    isDeleted: false,
    isPublic: true,
  });

  // Add viewer-specific flags
  const postsWithFlags = posts.map((post) => ({
    ...post,
    isLiked: post.likes?.some((id) => id.toString() === req.user._id.toString()),
    isSaved: post.saves?.some((id) => id.toString() === req.user._id.toString()),
    likesCount: post.likes?.length || 0,
    commentsCount: post.comments?.length || 0,
  }));

  res.status(200).json({
    success: true,
    posts: postsWithFlags,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit), hasMore: skip + posts.length < total },
  });
});

// ─── Get Explore Posts (Trending) ─────────────────────────────────────────────
exports.getExplorePosts = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, hashtag } = req.query;
  const skip = (page - 1) * limit;

  const filter = { isDeleted: false, isPublic: true };
  if (hashtag) filter.hashtags = hashtag.toLowerCase();

  const posts = await Post.find(filter)
    .sort({ likes: -1, createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('author', 'username fullName avatar isVerified')
    .lean();

  const total = await Post.countDocuments(filter);

  res.status(200).json({
    success: true,
    posts,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// ─── Get Single Post ──────────────────────────────────────────────────────────
exports.getPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id)
    .populate('author', 'username fullName avatar isVerified')
    .populate('comments.user', 'username fullName avatar')
    .populate('comments.replies.user', 'username avatar');

  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);

  // Increment views
  post.views += 1;
  await post.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, post });
});

// ─── Get User Posts ───────────────────────────────────────────────────────────
exports.getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { page = 1, limit = 12 } = req.query;
  const skip = (page - 1) * limit;

  const posts = await Post.find({ author: userId, isDeleted: false })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('author', 'username fullName avatar')
    .lean();

  const total = await Post.countDocuments({ author: userId, isDeleted: false });

  res.status(200).json({
    success: true,
    posts,
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// ─── Delete Post ──────────────────────────────────────────────────────────────
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);

  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this post.', 403);
  }

  // Delete media from Cloudinary
  for (const media of post.media) {
    if (media.publicId) {
      await deleteFromCloudinary(media.publicId, media.type === 'video' ? 'video' : 'image');
    }
  }

  post.isDeleted = true;
  await post.save();

  await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });

  res.status(200).json({ success: true, message: 'Post deleted.' });
});

// ─── Edit Post ────────────────────────────────────────────────────────────────
exports.editPost = asyncHandler(async (req, res, next) => {
  const { caption, location } = req.body;
  const post = await Post.findById(req.params.id);

  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);
  if (post.author.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized to edit this post.', 403);
  }

  if (caption !== undefined) post.caption = caption;
  if (location !== undefined) post.location = location;
  post.editedAt = new Date();
  await post.save();

  res.status(200).json({ success: true, message: 'Post updated.', post });
});

// ─── Like / Unlike Post ───────────────────────────────────────────────────────
exports.toggleLike = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);

  const userId = req.user._id.toString();
  const isLiked = post.likes.some((id) => id.toString() === userId);

  if (isLiked) {
    post.likes.pull(req.user._id);
  } else {
    post.likes.push(req.user._id);

    // Notify post author (not if liking own post)
    if (post.author.toString() !== userId) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'like',
        post: post._id,
        text: `${req.user.username} liked your post.`,
        link: `/post/${post._id}`,
      });

      if (global.io) {
        global.io.to(post.author.toString()).emit('notification', {
          type: 'like',
          sender: { username: req.user.username, avatar: req.user.avatar },
          message: `${req.user.username} liked your post.`,
          postId: post._id,
        });
      }
    }
  }

  await post.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    isLiked: !isLiked,
    likesCount: post.likes.length,
  });
});

// ─── Add Comment ──────────────────────────────────────────────────────────────
exports.addComment = asyncHandler(async (req, res, next) => {
  const { text } = req.body;
  if (!text?.trim()) throw new AppError('Comment text is required.', 400);

  const post = await Post.findById(req.params.id);
  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);

  const comment = { user: req.user._id, text: text.trim() };
  post.comments.push(comment);
  await post.save({ validateBeforeSave: false });

  // Populate newly added comment
  const updatedPost = await Post.findById(post._id)
    .populate('comments.user', 'username fullName avatar');
  const newComment = updatedPost.comments[updatedPost.comments.length - 1];

  // Notify post author
  if (post.author.toString() !== req.user._id.toString()) {
    await Notification.create({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      post: post._id,
      text: `${req.user.username} commented on your post.`,
      link: `/post/${post._id}`,
    });

    if (global.io) {
      global.io.to(post.author.toString()).emit('notification', {
        type: 'comment',
        sender: { username: req.user.username, avatar: req.user.avatar },
        message: `${req.user.username} commented on your post.`,
        postId: post._id,
      });
    }
  }

  res.status(201).json({ success: true, comment: newComment });
});

// ─── Delete Comment ───────────────────────────────────────────────────────────
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const { id: postId, commentId } = req.params;
  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found.', 404);

  const comment = post.comments.id(commentId);
  if (!comment) throw new AppError('Comment not found.', 404);

  const isOwner = comment.user.toString() === req.user._id.toString();
  const isPostAuthor = post.author.toString() === req.user._id.toString();

  if (!isOwner && !isPostAuthor && req.user.role !== 'admin') {
    throw new AppError('Not authorized to delete this comment.', 403);
  }

  comment.deleteOne();
  await post.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Comment deleted.' });
});

// ─── Reply to Comment ─────────────────────────────────────────────────────────
exports.replyToComment = asyncHandler(async (req, res, next) => {
  const { id: postId, commentId } = req.params;
  const { text } = req.body;
  if (!text?.trim()) throw new AppError('Reply text is required.', 400);

  const post = await Post.findById(postId);
  if (!post) throw new AppError('Post not found.', 404);

  const comment = post.comments.id(commentId);
  if (!comment) throw new AppError('Comment not found.', 404);

  comment.replies.push({ user: req.user._id, text: text.trim() });
  await post.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, message: 'Reply added.' });
});

// ─── Save / Unsave Post ───────────────────────────────────────────────────────
exports.toggleSave = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post || post.isDeleted) throw new AppError('Post not found.', 404);

  const user = await User.findById(req.user._id);
  const isSaved = user.savedPosts.includes(req.params.id);

  if (isSaved) {
    user.savedPosts.pull(req.params.id);
    post.saves.pull(req.user._id);
  } else {
    user.savedPosts.addToSet(req.params.id);
    post.saves.addToSet(req.user._id);
  }

  await user.save({ validateBeforeSave: false });
  await post.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, isSaved: !isSaved });
});

// ─── Get Saved Posts ──────────────────────────────────────────────────────────
exports.getSavedPosts = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'savedPosts',
    match: { isDeleted: false },
    populate: { path: 'author', select: 'username fullName avatar' },
    options: { sort: { createdAt: -1 } },
  });

  res.status(200).json({ success: true, posts: user.savedPosts });
});

// ─── Search Posts ─────────────────────────────────────────────────────────────
exports.searchPosts = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  if (!q) throw new AppError('Search query is required.', 400);

  const skip = (page - 1) * limit;
  const posts = await Post.find({
    $or: [
      { caption: { $regex: q, $options: 'i' } },
      { hashtags: { $regex: q.replace('#', ''), $options: 'i' } },
    ],
    isDeleted: false,
    isPublic: true,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('author', 'username fullName avatar')
    .lean();

  res.status(200).json({ success: true, posts });
});

// ─── Report Post ──────────────────────────────────────────────────────────────
exports.reportPost = asyncHandler(async (req, res, next) => {
  const post = await Post.findById(req.params.id);
  if (!post) throw new AppError('Post not found.', 404);

  if (post.reportedBy.includes(req.user._id)) {
    return res.status(200).json({ success: true, message: 'You have already reported this post.' });
  }

  post.reportedBy.push(req.user._id);
  await post.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Post reported. Thank you for keeping Vibe safe.' });
});
