const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: { 
    url: String, 
    publicId: String, 
    type: { type: String, enum: ['image', 'video'] } 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: { expires: 0 } 
  },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema);
