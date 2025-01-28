const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['post', 'story'],
    required: true
  },
  content: {
    mediaUrl: String,
    mediaType: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    caption: String
  },
  visibility: {
    type: String,
    enum: ['public', 'friends', 'private'],
    default: 'public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  storyConfig: {
    expiresAt: Date,
    views: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  }
}, {
  timestamps: true
});

// Middleware para manejar la expiración de historias
postSchema.pre('save', function(next) {
  if (this.type === 'story' && !this.storyConfig.expiresAt) {
    this.storyConfig.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas
  }
  next();
});

// Índices para búsquedas eficientes
postSchema.index({ author: 1, type: 1, createdAt: -1 });
postSchema.index({ 'storyConfig.expiresAt': 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Post', postSchema);