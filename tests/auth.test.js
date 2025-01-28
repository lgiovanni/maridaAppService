const AuthService = require('../services/auth.service');
const User = require('../models/user.model');
const { sendEmail } = require('../utils/email.util');
const { sendSMS } = require('../utils/sms.util');

jest.mock('../utils/email.util');
jest.mock('../utils/sms.util');
jest.mock('../models/user.model');

describe('AuthService', () => {
  let authService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('registerWithEmail', () => {
    const mockUserData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User'
    };

    it('should create a new user with email verification', async () => {
      const mockUser = {
        ...mockUserData,
        _id: 'mock-id',
        authType: 'email',
        verified: false,
        verificationCode: '123456',
        verificationCodeExpires: new Date(),
        generateVerificationCode: function() {
          this.verificationCode = '123456';
          this.verificationCodeExpires = new Date(Date.now() + 30 * 60000);
          return this.verificationCode;
        },
        save: jest.fn().mockResolvedValue(this),
        toJSON: function() {
          return { ...this };
        }
      };

      User.create.mockResolvedValue(mockUser);
      const user = await authService.registerWithEmail(mockUserData);

      expect(user.email).toBe(mockUserData.email);
      expect(user.name).toBe(mockUserData.name);
      expect(user.authType).toBe('email');
      expect(user.verified).toBe(false);
      expect(user.verificationCode).toBeDefined();
      expect(user.verificationCodeExpires).toBeDefined();
      expect(sendEmail).toHaveBeenCalled();
    });

    it('should not create user with duplicate email', async () => {
      User.create.mockRejectedValue(new Error('Duplicate email'));
      await expect(authService.registerWithEmail(mockUserData)).rejects.toThrow();
    });
  });

  describe('registerWithPhone', () => {
    const mockUserData = {
      phoneNumber: '+1234567890',
      password: 'password123',
      name: 'Test User'
    };

    it('should create a new user with phone verification', async () => {
      const mockUser = {
        ...mockUserData,
        _id: 'mock-id',
        authType: 'phone',
        verified: false,
        verificationCode: '123456',
        verificationCodeExpires: new Date(),
        generateVerificationCode: function() {
          this.verificationCode = '123456';
          this.verificationCodeExpires = new Date(Date.now() + 30 * 60000);
          return this.verificationCode;
        },
        save: jest.fn().mockResolvedValue(this),
        toJSON: function() {
          return { ...this };
        }
      };

      User.create.mockResolvedValue(mockUser);
      const user = await authService.registerWithPhone(mockUserData);

      expect(user.phoneNumber).toBe(mockUserData.phoneNumber);
      expect(user.name).toBe(mockUserData.name);
      expect(user.authType).toBe('phone');
      expect(user.verified).toBe(false);
      expect(user.verificationCode).toBeDefined();
      expect(user.verificationCodeExpires).toBeDefined();
      expect(sendSMS).toHaveBeenCalled();
    });

    it('should not create user with duplicate phone number', async () => {
      User.create.mockRejectedValue(new Error('Duplicate phone number'));
      await expect(authService.registerWithPhone(mockUserData)).rejects.toThrow();
    });
  });

  describe('verifyCode', () => {
    it('should verify user with valid code', async () => {
      const mockUser = {
        _id: 'mock-id',
        email: 'test@example.com',
        verificationCode: '123456',
        verified: false,
        save: jest.fn().mockResolvedValue(true),
        toJSON: function() {
          return { ...this };
        }
      };

      User.findOne.mockResolvedValue(mockUser);
      User.findById.mockResolvedValue({ ...mockUser, verified: true, verificationCode: undefined });

      const token = await authService.verifyCode(mockUser.email, mockUser.verificationCode);

      expect(mockUser.save).toHaveBeenCalled();
      expect(token).toBeDefined();
    });

    it('should reject invalid verification code', async () => {
      const mockUser = {
        email: 'test@example.com',
        verificationCode: '123456'
      };

      User.findOne.mockResolvedValue(mockUser);
      await expect(authService.verifyCode(mockUser.email, 'wrong-code')).rejects.toThrow();
    });
  });

  // Add more test cases as needed
});