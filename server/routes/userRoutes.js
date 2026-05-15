const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  updateAvatar,
  updateCoverImage,
  toggleFollow,
  searchUsers,
  getSuggestedUsers,
  getFollowers,
  getFollowing,
  changePassword,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');

router.get('/search', protect, searchUsers);
router.get('/suggested', protect, getSuggestedUsers);
router.get('/:username', protect, getUserProfile);
router.put('/profile/update', protect, updateProfile);
router.patch('/profile/avatar', protect, upload.single('avatar'), updateAvatar);
router.patch('/profile/cover', protect, upload.single('cover'), updateCoverImage);
router.patch('/profile/password', protect, changePassword);
router.post('/follow/:userId', protect, toggleFollow);
router.get('/:userId/followers', protect, getFollowers);
router.get('/:userId/following', protect, getFollowing);

module.exports = router;
