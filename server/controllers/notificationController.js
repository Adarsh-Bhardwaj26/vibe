const asyncHandler = require('express-async-handler');
const Notification = require('../models/Notification');

// ─── Get Notifications ────────────────────────────────────────────────────────
exports.getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'username fullName avatar')
    .populate('post', 'media caption')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .lean();

  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({ success: true, notifications, unreadCount });
});

// ─── Mark as Read ─────────────────────────────────────────────────────────────
exports.markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === 'all') {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
  } else {
    await Notification.findOneAndUpdate(
      { _id: id, recipient: req.user._id },
      { isRead: true }
    );
  }

  res.status(200).json({ success: true, message: 'Notifications marked as read.' });
});

// ─── Delete Notification ──────────────────────────────────────────────────────
exports.deleteNotification = asyncHandler(async (req, res) => {
  await Notification.findOneAndDelete({
    _id: req.params.id,
    recipient: req.user._id,
  });

  res.status(200).json({ success: true, message: 'Notification deleted.' });
});

// ─── Get Unread Count ─────────────────────────────────────────────────────────
exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false,
  });

  res.status(200).json({ success: true, count });
});
