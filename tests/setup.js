const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

// Clear database between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

// Global test utilities
global.generateTestToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '1h' });
};

// Mock external services
jest.mock('../utils/email.util', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

jest.mock('../utils/sms.util', () => ({
  sendSMS: jest.fn().mockResolvedValue(true)
}));

// Mock third-party APIs
jest.mock('@paypal/payouts-sdk', () => ({
  core: {
    SandboxEnvironment: jest.fn(),
    PayPalHttpClient: jest.fn().mockImplementation(() => ({
      execute: jest.fn().mockResolvedValue({
        statusCode: 201,
        result: {
          batch_header: {
            payout_batch_id: 'test_batch_id',
            batch_status: 'SUCCESS'
          }
        }
      })
    }))
  },
  payouts: {
    PayoutsPostRequest: jest.fn().mockImplementation(() => ({
      requestBody: jest.fn()
    }))
  }
}));

jest.mock('@binance/connector', () => ({
  Spot: jest.fn().mockImplementation(() => ({
    withdraw: jest.fn().mockResolvedValue({
      data: {
        id: 'test_withdrawal_id',
        status: 'SUCCESS'
      }
    })
  }))
}));