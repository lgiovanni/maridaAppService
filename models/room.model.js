const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['voice', 'video', 'chat'],
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    enum: [6, 8, 12, 15]
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'user'],
      default: 'user'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  activeParticipants: {
    type: Number,
    default: 0
  },
  tags: [String],
  popularityScore: {
    type: Number,
    default: 0
  },
  gifts: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    giftType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gift'
    },
    amount: Number,
    multiplier: Number,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'closed'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
roomSchema.index({ name: 'text', description: 'text' });
roomSchema.index({ popularityScore: -1 });
roomSchema.index({ status: 1, type: 1 });

module.exports = mongoose.model('Room', roomSchema);