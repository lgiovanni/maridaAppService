const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Campos de identificación
  email: {
    type: String,
    sparse: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function() {
        // Email requerido solo si no hay phoneNumber y authType es 'email'
        return !(this.authType === 'email' && !this.email);
      },
      message: 'Email es requerido para autenticación por email'
    }
  },
  phoneNumber: {
    type: String,
    sparse: true,
    trim: true,
    validate: {
      validator: function() {
        // Teléfono requerido solo si no hay email y authType es 'phone'
        return !(this.authType === 'phone' && !this.phoneNumber);
      },
      message: 'Número de teléfono requerido para autenticación por teléfono'
    }
  },
  password: {
    type: String,
    required: function() {
      // Password only required for email and phone authentication
      return this.authType && ['email', 'phone'].includes(this.authType);
    },
    select: false // Don't include password in queries by default
  },
  
  // Información del usuario
  name: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: String,
  
  // Roles y permisos
  roles: [{
    type: String,
    enum: ['superadmin', 'admin', 'coin_seller', 'agency_owner', 'emitter', 'user'],
    default: ['user']
  }],
  permissions: {
    canBanUsers: Boolean,
    canWarnUsers: Boolean,
    canCreateAgencies: Boolean,
    canSellCoins: Boolean,
    canAddCoins: Boolean,
    canEmitLive: Boolean,
    canCreateRooms: Boolean
  },

  // Información de agencia
  agency: {
    isOwner: Boolean,
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency'
    },
    commissionRate: Number,
    monthlyEarnings: Number,
    emitters: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },

  // Información de emisor
  emitter: {
    isActive: Boolean,
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency'
    },
    monthlyEarnings: Number,
    monthlyGoal: Number,
    totalEmissions: Number
  },
  
  // Autenticación
  authType: {
    type: String,
    required: true,
    enum: ['email', 'phone', 'google', 'facebook']
  },
  verified: {
    type: Boolean,
    default: false
  },
  verificationCode: String,
  verificationCodeExpires: Date,
  
  // OAuth info
  oauthProvider: {
    type: String,
    enum: ['google', 'facebook', null],
    sparse: true
  },
  oauthId: String,
  
  // Sistema social
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  favorites: {
    rooms: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    }],
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  },
  roomHistory: [{
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room'
    },
    lastVisited: Date
  }],
  
  // Sistema de monedas
  coins: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['purchase', 'gift', 'bonus', 'multiplier', 'commission', 'withdrawal'],
        required: true
      },
      amount: Number,
      multiplier: Number,
      timestamp: Date,
      reference: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'transactions.referenceModel'
      },
      referenceModel: {
        type: String,
        enum: ['Gift', 'Purchase', 'Room', 'Agency', 'Withdrawal', 'Transaction']
      }
    }],
  },
  
  // Sistema de pagos
  paymentInfo: {
    paypalEmail: String,
    epayAccount: String,
    binanceAccount: String,
    preferredPaymentMethod: {
      type: String,
      enum: ['paypal', 'epay', 'binance']
    },
    pendingWithdrawals: [{
      amount: Number,
      method: String,
      status: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed']
      },
      requestDate: Date,
      completionDate: Date
    }]
  },
  
  // Timestamps
  lastLogin: Date
}, {
  timestamps: true
});

// Middleware pre-save para hash de password
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Métodos del modelo
userSchema.methods = {
  comparePassword: async function(password) {
    return bcrypt.compare(password, this.password);
  },
  
  generateVerificationCode: function() {
    this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    this.verificationCodeExpires = new Date(Date.now() + 30 * 60000); // 30 minutos
    return this.verificationCode;
  },

  hasRole: function(role) {
    return this.roles.includes(role);
  },

  canPerform: function(permission) {
    return this.permissions[permission] === true;
  }
};

module.exports = mongoose.model('User', userSchema);