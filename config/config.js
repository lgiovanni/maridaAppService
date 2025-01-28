require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  environment: process.env.NODE_ENV || 'development',

  // Email configuration
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
    from: process.env.EMAIL_FROM || 'no-reply@maridaapp.com'
  },
  
  // Payment configurations
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    mode: process.env.PAYPAL_MODE || 'sandbox'
  },
  binance: {
    apiKey: process.env.BINANCE_API_KEY,
    apiSecret: process.env.BINANCE_API_SECRET,
    network: process.env.BINANCE_NETWORK || 'testnet'
  },
  epay: {
    merchantId: process.env.EPAY_MERCHANT_ID,
    apiKey: process.env.EPAY_API_KEY,
    environment: process.env.EPAY_ENVIRONMENT || 'sandbox'
  },

  // Google OAuth configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'test-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'test-client-secret',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
  },

  // Facebook OAuth configuration
  facebook: {
    appId: process.env.FACEBOOK_APP_ID || 'test-app-id',
    appSecret: process.env.FACEBOOK_APP_SECRET || 'test-app-secret',
    redirectUri: process.env.FACEBOOK_REDIRECT_URI || 'http://localhost:3000/auth/facebook/callback'
  },

  // Twilio configuration
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER
  },

  // Monthly rewards configuration
  monthlyRewards: {
    tiers: [
      {
        coins: parseInt(process.env.TIER1_COINS) || 20000,
        reward: parseFloat(process.env.TIER1_REWARD) || 10
      },
      {
        coins: parseInt(process.env.TIER2_COINS) || 35000,
        reward: parseFloat(process.env.TIER2_REWARD) || 24
      }
    ],
    currency: process.env.REWARD_CURRENCY || 'USD'
  }
};