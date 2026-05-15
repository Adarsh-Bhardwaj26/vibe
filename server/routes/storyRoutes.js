const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../utils/multerConfig');
const { createStory, getFeedStories, viewStory } = require('../controllers/storyController');

router.use(protect);

router.post('/', upload.single('media'), createStory);
router.get('/feed', getFeedStories);
router.patch('/:id/view', viewStory);

module.exports = router;
