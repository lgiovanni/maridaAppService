const mongoose = require('mongoose');

const communicationLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['EMAIL', 'SMS'],
    required: true
  },
  recipient: {
    type: String,
    required: true
  },
  purpose: {
    type: String,
    enum: ['VERIFICATION', 'NOTIFICATION', 'MARKETING'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'],
    default: 'PENDING'
  },
  attempts: {
    type: Number,
    default: 0
  },
  lastAttempt: Date,
  error: String,
  metadata: mongoose.Schema.Types.Mixed,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);