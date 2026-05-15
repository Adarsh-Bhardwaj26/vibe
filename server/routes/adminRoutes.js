const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  toggleUserStatus,
  getReportedPosts,
  adminDeletePost,
} = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.patch('/users/:userId/status', toggleUserStatus);
router.get('/reported-posts', getReportedPosts);
router.delete('/posts/:postId', adminDeletePost);

module.exports = router;
