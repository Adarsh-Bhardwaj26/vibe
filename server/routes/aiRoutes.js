const express = require('express');
const router = express.Router();
const { generateCaptionAndHashtags } = require('../services/aiService');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate-caption', protect, async (req, res) => {
  try {
    const { base64Image } = req.body;
    const caption = await generateCaptionAndHashtags(base64Image);
    res.json({ success: true, caption });
  } catch (error) {
    console.error("Generate Caption Route Error:", error);
    res.status(500).json({ success: false, message: error.message || 'Failed to generate AI caption' });
  }
});

router.post('/smart-replies', protect, async (req, res) => {
  try {
    const { messageText } = req.body;
    if (!messageText) return res.json({ success: true, replies: ["Yes", "No", "Thanks"] });
    
    const { generateSmartReplies } = require('../services/aiService');
    const replies = await generateSmartReplies(messageText);
    res.json({ success: true, replies });
  } catch (error) {
    console.error("Smart Replies Route Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/generate-bio', protect, async (req, res) => {
  try {
    const { keywords } = req.body;
    const { generateBio } = require('../services/aiService');
    const bio = await generateBio(keywords);
    res.json({ success: true, bio });
  } catch (error) {
    console.error("Generate Bio Route Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
