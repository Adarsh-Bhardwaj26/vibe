const asyncHandler = require('express-async-handler');
const Story = require('../models/Story');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../utils/cloudinaryHelper');

exports.createStory = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    throw new AppError('Story must have media.', 400);
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const result = await uploadToCloudinary(req.file.buffer, 'stories', isVideo ? 'video' : 'image');

  const story = await Story.create({
    author: req.user._id,
    media: {
      url: result.secure_url,
      publicId: result.public_id,
      type: isVideo ? 'video' : 'image'
    },
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  });

  await story.populate('author', 'username fullName avatar');

  res.status(201).json({ success: true, story });
});

exports.getFeedStories = asyncHandler(async (req, res, next) => {
  const currentUser = await User.findById(req.user._id);
  const followingIds = [...currentUser.following, req.user._id];

  const stories = await Story.find({
    author: { $in: followingIds },
    expiresAt: { $gt: new Date() }
  })
    .sort({ createdAt: 1 })
    .populate('author', 'username fullName avatar')
    .lean();

  // Group stories by author
  const groupedStories = {};
  stories.forEach(story => {
    const authorId = story.author._id.toString();
    if (!groupedStories[authorId]) {
      groupedStories[authorId] = {
        author: story.author,
        stories: []
      };
    }
    groupedStories[authorId].stories.push(story);
  });

  // Convert to array and put current user first if they have stories
  let result = Object.values(groupedStories);
  const myStoriesIndex = result.findIndex(g => g.author._id.toString() === req.user._id.toString());
  if (myStoriesIndex > 0) {
    const myStories = result.splice(myStoriesIndex, 1)[0];
    result.unshift(myStories);
  }

  res.status(200).json({ success: true, groupedStories: result });
});

exports.viewStory = asyncHandler(async (req, res, next) => {
  await Story.findByIdAndUpdate(req.params.id, {
    $addToSet: { viewers: req.user._id }
  });
  res.status(200).json({ success: true });
});
