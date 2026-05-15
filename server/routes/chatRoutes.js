const express = require('express');
const router = express.Router();
const {
  getConversations,
  createConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  deleteMessage,
  addReaction,
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');

router.get('/conversations', protect, getConversations);
router.post('/conversations/group', protect, createGroupConversation);
router.post('/conversations/:userId', protect, createConversation);
router.get('/conversations/:conversationId/messages', protect, getMessages);
router.post('/conversations/:conversationId/messages', protect, upload.single('media'), sendMessage);
router.delete('/messages/:messageId', protect, deleteMessage);
router.post('/messages/:messageId/reaction', protect, addReaction);

module.exports = router;
