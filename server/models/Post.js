const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        text: { type: String, maxlength: 500 },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      maxlength: [2200, 'Caption cannot exceed 2200 characters'],
      default: '',
    },
    media: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        type: { type: String, enum: ['image', 'video'], default: 'image' },
        width: Number,
        height: Number,
      },
    ],
    hashtags: [{ type: String, lowercase: true }],
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [commentSchema],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    location: { type: String, default: '' },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
    reportedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    editedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

postSchema.virtual('likesCount').get(function () {
  return this.likes?.length || 0;
});
postSchema.virtual('commentsCount').get(function () {
  return this.comments?.length || 0;
});
postSchema.virtual('savesCount').get(function () {
  return this.saves?.length || 0;
});

// Extract hashtags from caption
postSchema.pre('save', async function () {
  if (this.isModified('caption') && this.caption) {
    const tags = this.caption.match(/#\w+/g) || [];
    this.hashtags = tags.map((t) => t.slice(1).toLowerCase());
  }
});

// Indexes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ caption: 'text' });
postSchema.index({ createdAt: -1 });
postSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Post', postSchema);
