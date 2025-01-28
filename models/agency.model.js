const mongoose = require('mongoose');

const agencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  // Configuración de comisiones
  commissionRates: {
    liveStream: {
      type: Number,
      default: 0.3, // 30% por defecto
      min: 0,
      max: 1
    },
    monthlyEarnings: {
      type: Number,
      default: 0.2, // 20% por defecto
      min: 0,
      max: 1
    }
  },
  // Miembros de la agencia (emisores)
  emitters: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinDate: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'inactive', 'rejected'],
      default: 'pending'
    },
    customCommissionRates: {
      liveStream: Number,
      monthlyEarnings: Number
    }
  }],
  // Estadísticas de la agencia
  statistics: {
    totalEmitters: {
      type: Number,
      default: 0
    },
    monthlyEarnings: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    activeStreams: {
      type: Number,
      default: 0
    }
  },
  // Control y moderación
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  moderationLogs: [{
    action: String,
    reason: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
agencySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para actualizar estadísticas
agencySchema.pre('save', function(next) {
  if (this.isModified('emitters')) {
    this.statistics.totalEmitters = this.emitters.filter(e => e.status === 'active').length;
  }
  next();
});

module.exports = mongoose.model('Agency', agencySchema);