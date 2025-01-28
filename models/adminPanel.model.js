const mongoose = require('mongoose');

const adminPanelSchema = new mongoose.Schema({
  // Registro de acciones administrativas
  moderationLogs: [{
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    actionType: {
      type: String,
      enum: ['ban', 'warning', 'unban', 'coin_addition', 'agency_creation', 'seller_creation'],
      required: true
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    details: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Configuración global de la aplicación
  globalSettings: {
    minWithdrawalAmount: {
      type: Number,
      default: 10
    },
    maxWithdrawalAmount: {
      type: Number,
      default: 1000
    },
    defaultCommissionRate: {
      type: Number,
      default: 0.1
    },
    minCoinPurchase: {
      type: Number,
      default: 100
    },
    coinsPerUSD: {
      type: Number,
      default: 100
    }
  },

  // Lista de usuarios baneados
  bannedUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    banDate: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date
  }],

  // Warnings enviados a usuarios
  warnings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    acknowledged: {
      type: Boolean,
      default: false
    }
  }],

  // Estadísticas de moderación
  moderationStats: {
    totalBans: {
      type: Number,
      default: 0
    },
    totalWarnings: {
      type: Number,
      default: 0
    },
    totalCoinsAdded: {
      type: Number,
      default: 0
    },
    totalAgenciesCreated: {
      type: Number,
      default: 0
    }
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para actualizar updatedAt
adminPanelSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para actualizar estadísticas
adminPanelSchema.pre('save', function(next) {
  if (this.isModified('bannedUsers')) {
    this.moderationStats.totalBans = this.bannedUsers.length;
  }
  if (this.isModified('warnings')) {
    this.moderationStats.totalWarnings = this.warnings.length;
  }
  next();
});

module.exports = mongoose.model('AdminPanel', adminPanelSchema);