const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Map of userId -> socketId for presence tracking
const onlineUsers = new Map();

const initSocket = (io) => {
  // Attach to global for controllers to emit events
  global.io = io;
  global.onlineUsers = onlineUsers;

  // Auth middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required.'));

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const user = await User.findById(decoded.id).select('username fullName avatar');
      if (!user) return next(new Error('User not found.'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.username} (${socket.id})`);

    // Track online user
    onlineUsers.set(userId, socket.id);

    // Join personal room (for targeted notifications)
    socket.join(userId);

    // Broadcast online status to all
    io.emit('user_online', { userId, user: socket.user });

    // ─── Join Chat Room ─────────────────────────────────────────────────────
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`💬 ${socket.user.username} joined conversation: ${conversationId}`);
    });

    // ─── Leave Chat Room ────────────────────────────────────────────────────
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // ─── Typing Indicator ────────────────────────────────────────────────────
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_start', {
        userId,
        user: { username: socket.user.username, avatar: socket.user.avatar },
        conversationId,
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_stop', { userId, conversationId });
    });

    // ─── Message Read ────────────────────────────────────────────────────────
    socket.on('message_read', ({ conversationId, messageId }) => {
      socket.to(conversationId).emit('message_read', { userId, messageId, conversationId });
    });

    // ─── Get Online Users ────────────────────────────────────────────────────
    socket.on('get_online_users', () => {
      socket.emit('online_users', Array.from(onlineUsers.keys()));
    });

    // ─── WebRTC Video / Audio Call Signaling ─────────────────────────────────
    // Caller sends offer to a specific user
    socket.on('call_offer', ({ toUserId, offer, callType }) => {
      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('call_offer', {
          fromUserId: userId,
          fromUser: socket.user,
          offer,
          callType, // 'video' or 'audio'
        });
      } else {
        // Target user is offline
        socket.emit('call_rejected', { reason: 'User is offline.' });
      }
    });

    // Callee sends answer back to caller
    socket.on('call_answer', ({ toUserId, answer }) => {
      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('call_answer', { fromUserId: userId, answer });
      }
    });

    // ICE candidates exchange (both directions)
    socket.on('ice_candidate', ({ toUserId, candidate }) => {
      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('ice_candidate', { fromUserId: userId, candidate });
      }
    });

    // Callee rejects the incoming call
    socket.on('call_reject', ({ toUserId }) => {
      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('call_rejected', { reason: 'Call declined.' });
      }
    });

    // Either party ends the call
    socket.on('call_end', ({ toUserId }) => {
      const toSocketId = onlineUsers.get(toUserId);
      if (toSocketId) {
        io.to(toSocketId).emit('call_ended');
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.user.username}`);
      onlineUsers.delete(userId);

      // Update last active in DB
      await User.findByIdAndUpdate(userId, { lastActive: new Date() });

      io.emit('user_offline', { userId });
    });
  });
};

module.exports = { initSocket };
