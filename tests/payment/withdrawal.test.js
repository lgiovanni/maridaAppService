const WithdrawalService = require('../../services/payment/withdrawal.service');
const User = require('../../models/user.model');
const Transaction = require('../../models/transaction.model');

describe('WithdrawalService', () => {
  let withdrawalService;
  let testUser;

  beforeEach(async () => {
    withdrawalService = new WithdrawalService();
    // Mock PayPal client's execute method to return success by default
    withdrawalService.paypalClient = {
      execute: jest.fn().mockResolvedValue({
        statusCode: 201,
        result: {
          batch_header: {
            payout_batch_id: 'test_batch_id',
            batch_status: 'SUCCESS'
          }
        }
      })
    };
    
    // Mock Binance client's withdraw method
    withdrawalService.binanceClient = {
      withdraw: jest.fn().mockResolvedValue({
        data: {
          id: 'test_withdraw_id',
          status: 'SUCCESS'
        }
      })
    };
    
    // Mock axios for ePay requests
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: {
        success: true,
        transaction_id: 'test_epay_id',
        status: 'completed'
      }
    });
    
    // Create test user with initial balance
    testUser = new User({
      email: 'test@example.com',
      name: 'Test User',
      authType: 'google', // Using social auth to avoid password requirement
      verified: true,
      coins: {
        balance: 1000,
        transactions: []
      },
      paymentInfo: {
        paypalEmail: 'test@example.com',
        binanceAccount: 'binance-account',
        epayAccount: 'epay-account'
      },
      social: {
        google: {
          id: 'test-google-id',
          email: 'test@example.com'
        }
      }
    });
    await testUser.save();
  });

  describe('processWithdrawal', () => {
    it('should process PayPal withdrawal successfully', async () => {
      const amount = 100;
      const transaction = await withdrawalService.processWithdrawal(
        testUser._id,
        amount,
        'paypal'
      );

      const updatedUser = await User.findById(testUser._id);
      
      expect(transaction.status).toBe('succeeded');
      expect(transaction.amount).toBe(amount);
      expect(transaction.paymentMethod).toBe('paypal');
      expect(updatedUser.coins.balance).toBe(900);
      expect(updatedUser.paymentInfo.pendingWithdrawals[0].status).toBe('completed');
    });

    it('should process Binance withdrawal successfully', async () => {
      const amount = 200;
      const transaction = await withdrawalService.processWithdrawal(
        testUser._id,
        amount,
        'binance'
      );

      const updatedUser = await User.findById(testUser._id);
      
      expect(transaction.status).toBe('succeeded');
      expect(transaction.amount).toBe(amount);
      expect(transaction.paymentMethod).toBe('binance');
      expect(updatedUser.coins.balance).toBe(800);
      expect(updatedUser.paymentInfo.pendingWithdrawals[0].status).toBe('completed');
    });

    it('should process ePay withdrawal successfully', async () => {
      const amount = 150;
      const transaction = await withdrawalService.processWithdrawal(
        testUser._id,
        amount,
        'epay'
      );

      const updatedUser = await User.findById(testUser._id);
      
      expect(transaction.status).toBe('succeeded');
      expect(transaction.amount).toBe(amount);
      expect(transaction.paymentMethod).toBe('epay');
      expect(updatedUser.coins.balance).toBe(850);
      expect(updatedUser.paymentInfo.pendingWithdrawals[0].status).toBe('completed');
    });

    it('should fail withdrawal with insufficient balance', async () => {
      const amount = 2000; // More than user's balance
      
      await expect(withdrawalService.processWithdrawal(
        testUser._id,
        amount,
        'paypal'
      )).rejects.toThrow('Saldo insuficiente');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.coins.balance).toBe(1000); // Balance should remain unchanged
    });

    it('should fail withdrawal with unconfigured payment method', async () => {
      testUser.paymentInfo.binanceAccount = undefined;
      await testUser.save();

      await expect(withdrawalService.processWithdrawal(
        testUser._id,
        100,
        'binance'
      )).rejects.toThrow('Cuenta de binance no configurada');

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.coins.balance).toBe(1000);
    });

    it('should handle payment processor errors gracefully', async () => {
      // Mock PayPal to throw an error
      const mockPayPalError = new Error('PayPal service unavailable');
      withdrawalService.paypalClient.execute = jest.fn().mockRejectedValue(mockPayPalError);

      await expect(withdrawalService.processWithdrawal(
        testUser._id,
        100,
        'paypal'
      )).rejects.toThrow('PayPal service unavailable');

      const updatedUser = await User.findById(testUser._id);
      const failedTransaction = await Transaction.findOne({
        userId: testUser._id,
        status: 'failed'
      });

      expect(updatedUser.coins.balance).toBe(1000); // Balance should be restored
      expect(failedTransaction).toBeDefined();
      expect(failedTransaction.errorMessage).toBe('PayPal service unavailable');
    });
  });
});