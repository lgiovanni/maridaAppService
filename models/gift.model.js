const mongoose = require('mongoose');

const giftSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  icon: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 1
  },
  type: {
    type: String,
    enum: ['normal', 'multiplier'],
    required: true
  },
  multiplierConfig: {
    enabled: {
      type: Boolean,
      default: false
    },
    values: [{
      multiplier: Number,
      probability: Number
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Validación para asegurar que los multiplicadores sumen 100%
giftSchema.pre('save', function(next) {
  if (this.type === 'multiplier' && this.multiplierConfig.enabled) {
    const totalProbability = this.multiplierConfig.values.reduce(
      (sum, config) => sum + config.probability,
      0
    );
    if (Math.abs(totalProbability - 100) > 0.01) {
      next(new Error('La suma de las probabilidades debe ser 100%'));
    }
  }
  next();
});

module.exports = mongoose.model('Gift', giftSchema);