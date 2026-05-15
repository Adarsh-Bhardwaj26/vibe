const express = require('express');
const router = express.Router();
const {
  createPost,
  getFeedPosts,
  getExplorePosts,
  getPost,
  getUserPosts,
  deletePost,
  editPost,
  toggleLike,
  addComment,
  deleteComment,
  replyToComment,
  toggleSave,
  getSavedPosts,
  searchPosts,
  reportPost,
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');

router.get('/feed', protect, getFeedPosts);
router.get('/explore', protect, getExplorePosts);
router.get('/search', protect, searchPosts);
router.get('/saved', protect, getSavedPosts);
router.post('/', protect, upload.array('media', 10), createPost);
router.get('/:id', protect, getPost);
router.patch('/:id', protect, editPost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/save', protect, toggleSave);
router.post('/:id/comment', protect, addComment);
router.delete('/:id/comment/:commentId', protect, deleteComment);
router.post('/:id/comment/:commentId/reply', protect, replyToComment);
router.post('/:id/report', protect, reportPost);
router.get('/user/:userId', protect, getUserPosts);

module.exports = router;
