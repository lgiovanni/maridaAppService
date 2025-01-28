const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'FRIEND_REQUEST',
      'FRIEND_ACCEPT',
      'GIFT_RECEIVED',
      'ROOM_INVITATION',
      'ROOM_MENTION',
      'SYSTEM_NOTIFICATION',
      'CONTENT_WARNING'
    ],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  actionUrl: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Índices para mejorar el rendimiento de las consultas
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);