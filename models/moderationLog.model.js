const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema({
  moderator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['USER', 'POST', 'ROOM', 'COMMENT'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  action: {
    type: String,
    enum: [
      'WARNING',
      'MUTE',
      'TEMPORARY_BAN',
      'PERMANENT_BAN',
      'CONTENT_REMOVE',
      'CONTENT_FLAG'
    ],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED', 'REVOKED'],
    default: 'ACTIVE'
  },
  notes: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Índices para consultas frecuentes
moderationLogSchema.index({ moderator: 1 });
moderationLogSchema.index({ targetType: 1, targetId: 1 });
moderationLogSchema.index({ status: 1 });
moderationLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ModerationLog', moderationLogSchema);