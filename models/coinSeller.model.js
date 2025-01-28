const mongoose = require('mongoose');

const coinSellerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  // Balance de monedas disponibles para vender
  availableCoins: {
    type: Number,
    default: 0,
    min: 0
  },
  // Historial de ventas
  salesHistory: [{
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 1
    },
    pricePerCoin: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'failed'],
      default: 'pending'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    completedAt: Date
  }],
  // Estadísticas del vendedor
  statistics: {
    totalSales: {
      type: Number,
      default: 0
    },
    totalCoinsTraded: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    averagePricePerCoin: {
      type: Number,
      default: 0
    },
    lastSaleDate: Date
  },
  // Estado y configuración del vendedor
  status: {
    type: String,
    enum: ['active', 'suspended', 'inactive'],
    default: 'active'
  },
  settings: {
    minimumSaleAmount: {
      type: Number,
      default: 100
    },
    maximumSaleAmount: {
      type: Number,
      default: 10000
    },
    currentPricePerCoin: {
      type: Number,
      required: true
    }
  },
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
coinSellerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware para actualizar estadísticas después de una venta
coinSellerSchema.methods.updateStatisticsAfterSale = function(sale) {
  if (sale.status === 'completed') {
    this.statistics.totalSales++;
    this.statistics.totalCoinsTraded += sale.amount;
    this.statistics.totalEarnings += sale.totalPrice;
    this.statistics.lastSaleDate = sale.completedAt;
    this.statistics.averagePricePerCoin = 
      this.statistics.totalEarnings / this.statistics.totalCoinsTraded;
  }
};

// Método para verificar si puede realizar una venta
coinSellerSchema.methods.canSell = function(amount) {
  return this.status === 'active' && 
         this.availableCoins >= amount &&
         amount >= this.settings.minimumSaleAmount &&
         amount <= this.settings.maximumSaleAmount;
};

module.exports = mongoose.model('CoinSeller', coinSellerSchema);