const asyncHandler = require('express-async-handler');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AppError = require('../utils/AppError');
const { uploadToCloudinary } = require('../utils/cloudinaryHelper');

// ─── Get All Conversations ────────────────────────────────────────────────────
exports.getConversations = asyncHandler(async (req, res) => {
  const conversations = await Conversation.find({
    participants: req.user._id,
    'deletedFor.user': { $ne: req.user._id },
  })
    .populate('participants', 'username fullName avatar isVerified lastActive')
    .populate({
      path: 'lastMessage',
      select: 'content messageType sender createdAt isDeleted',
      populate: { path: 'sender', select: 'username avatar' },
    })
    .sort({ updatedAt: -1 })
    .lean();

  res.status(200).json({ success: true, conversations });
});

// ─── Create or Get DM Conversation ───────────────────────────────────────────
exports.createConversation = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;

  if (userId === req.user._id.toString()) {
    throw new AppError("You can't message yourself.", 400);
  }

  const targetUser = await User.findById(userId);
  if (!targetUser) throw new AppError('User not found.', 404);

  // Check if DM already exists
  let conversation = await Conversation.findOne({
    isGroup: false,
    participants: { $all: [req.user._id, userId], $size: 2 },
  });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, userId],
      isGroup: false,
    });
  }

  await conversation.populate('participants', 'username fullName avatar isVerified lastActive');

  res.status(200).json({ success: true, conversation });
});

// ─── Create Group Conversation ────────────────────────────────────────────────
exports.createGroupConversation = asyncHandler(async (req, res, next) => {
  const { name, participantIds, description } = req.body;

  if (!name) throw new AppError('Group name is required.', 400);
  if (!participantIds || participantIds.length < 2) {
    throw new AppError('A group needs at least 2 other members.', 400);
  }

  const allParticipants = [...new Set([req.user._id.toString(), ...participantIds])];

  const conversation = await Conversation.create({
    participants: allParticipants,
    isGroup: true,
    groupName: name,
    groupDescription: description || '',
    groupAdmin: req.user._id,
  });

  await conversation.populate('participants', 'username fullName avatar');

  res.status(201).json({ success: true, conversation });
});

// ─── Get Messages for a Conversation ─────────────────────────────────────────
exports.getMessages = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { page = 1, limit = 30 } = req.query;
  const skip = (page - 1) * limit;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError('Conversation not found.', 404);

  if (!conversation.participants.includes(req.user._id)) {
    throw new AppError('Not authorized to view this conversation.', 403);
  }

  const messages = await Message.find({
    conversation: conversationId,
    deletedFor: { $ne: req.user._id },
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('sender', 'username fullName avatar')
    .populate('replyTo', 'content sender')
    .lean();

  // Mark messages as read
  await Message.updateMany(
    {
      conversation: conversationId,
      sender: { $ne: req.user._id },
      'readBy.user': { $ne: req.user._id },
    },
    { $addToSet: { readBy: { user: req.user._id, readAt: new Date() } } }
  );

  // Emit read event via socket
  if (global.io) {
    global.io.to(conversationId).emit('messages_read', {
      conversationId,
      userId: req.user._id,
    });
  }

  const total = await Message.countDocuments({ conversation: conversationId, isDeleted: false });

  res.status(200).json({
    success: true,
    messages: messages.reverse(), // Oldest first
    pagination: { total, page: Number(page), pages: Math.ceil(total / limit) },
  });
});

// ─── Send Message ─────────────────────────────────────────────────────────────
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { conversationId } = req.params;
  const { content, messageType = 'text', replyToId } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new AppError('Conversation not found.', 404);

  if (!conversation.participants.includes(req.user._id)) {
    throw new AppError('Not authorized.', 403);
  }

  let mediaData = {};
  if (req.file) {
    const isVideo = req.file.mimetype.startsWith('video/');
    const isAudio = req.file.mimetype.startsWith('audio/');
    const result = await uploadToCloudinary(
      req.file.buffer,
      'chat-media',
      isVideo ? 'video' : isAudio ? 'video' : 'image'
    );
    mediaData = {
      url: result.secure_url,
      publicId: result.public_id,
      type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
    };
  }

  if (!content?.trim() && !req.file) {
    throw new AppError('Message must have content or media.', 400);
  }

  const message = await Message.create({
    conversation: conversationId,
    sender: req.user._id,
    content: content?.trim() || '',
    messageType: req.file ? (req.file.mimetype.startsWith('video') ? 'video' : req.file.mimetype.startsWith('audio') ? 'audio' : 'image') : messageType,
    media: req.file ? mediaData : undefined,
    replyTo: replyToId || undefined,
  });

  // Update conversation's last message and timestamp
  conversation.lastMessage = message._id;
  conversation.updatedAt = new Date();
  await conversation.save();

  // Increment unread count for all other participants
  const otherParticipants = conversation.participants.filter(
    (p) => p.toString() !== req.user._id.toString()
  );

  await message.populate('sender', 'username fullName avatar');

  // Emit to all conversation members via socket
  if (global.io) {
    global.io.to(conversationId).emit('new_message', message);

    // Send notification to offline participants
    for (const participantId of otherParticipants) {
      const isOnline = global.onlineUsers?.has(participantId.toString());
      if (!isOnline) {
        await Notification.create({
          recipient: participantId,
          sender: req.user._id,
          type: 'message',
          conversation: conversationId,
          text: `${req.user.username}: ${content || '📎 Sent media'}`,
          link: `/chat/${conversationId}`,
        });
      }
    }
  }

  res.status(201).json({ success: true, message });

  // ─── Vibe Bot Interception ──────────────────────────────────────────
  try {
    await conversation.populate('participants');
    const botParticipant = conversation.participants.find(p => p.username === 'vibebot');
    
    // If bot is in conversation and the sender IS NOT the bot
    if (botParticipant && req.user.username !== 'vibebot' && content?.trim()) {
      const { generateBotReply } = require('../services/aiService');
      
      // Simulate typing delay
      setTimeout(async () => {
        try {
          const botReplyText = await generateBotReply(content.trim());
          
          const botMessage = await Message.create({
            conversation: conversationId,
            sender: botParticipant._id,
            content: botReplyText,
            messageType: 'text',
          });

          conversation.lastMessage = botMessage._id;
          conversation.updatedAt = new Date();
          await conversation.save();

          await botMessage.populate('sender', 'username fullName avatar');

          if (global.io) {
            global.io.to(conversationId).emit('new_message', botMessage);
          }
        } catch (botErr) {
          console.error("Bot failed to reply:", botErr);
        }
      }, 1500); // 1.5 second artificial delay
    }
  } catch (err) {
    console.error("Error intercepting bot message:", err);
  }
});

// ─── Delete Message ───────────────────────────────────────────────────────────
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { deleteFor } = req.query; // 'me' | 'everyone'

  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found.', 404);

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new AppError('Not authorized.', 403);
  }

  if (deleteFor === 'everyone') {
    message.isDeleted = true;
    message.content = 'This message was deleted.';
    await message.save();

    if (global.io) {
      global.io.to(message.conversation.toString()).emit('message_deleted', {
        messageId,
        forEveryone: true,
      });
    }
  } else {
    message.deletedFor.push(req.user._id);
    await message.save();
  }

  res.status(200).json({ success: true, message: 'Message deleted.' });
});

// ─── Add Reaction to Message ──────────────────────────────────────────────────
exports.addReaction = asyncHandler(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  if (!emoji) throw new AppError('Emoji is required.', 400);

  const message = await Message.findById(messageId);
  if (!message) throw new AppError('Message not found.', 404);

  // Remove existing reaction from this user
  message.reactions = message.reactions.filter(
    (r) => r.user.toString() !== req.user._id.toString()
  );
  message.reactions.push({ user: req.user._id, emoji });
  await message.save();

  if (global.io) {
    global.io.to(message.conversation.toString()).emit('reaction_added', {
      messageId,
      reaction: { user: req.user._id, emoji },
    });
  }

  res.status(200).json({ success: true, message: 'Reaction added.' });
});
