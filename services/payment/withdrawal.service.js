const axios = require('axios');
const config = require('../../config/config');
const User = require('../../models/user.model');
const Transaction = require('../../models/transaction.model');
const paypal = require('@paypal/payouts-sdk');
const { Spot } = require('@binance/connector');

class WithdrawalService {
  constructor() {
    // Initialize PayPal client
    const paypalEnvironment = config.paypal.mode === 'sandbox' ?
      new paypal.core.SandboxEnvironment(config.paypal.clientId, config.paypal.clientSecret) :
      new paypal.core.LiveEnvironment(config.paypal.clientId, config.paypal.clientSecret);
    this.paypalClient = new paypal.core.PayPalHttpClient(paypalEnvironment);

    // Initialize Binance client
    this.binanceClient = new Spot(config.binance.apiKey, config.binance.apiSecret, {
      baseURL: config.binance.network === 'testnet' ? 'https://testnet.binance.vision' : 'https://api.binance.com'
    });

    // Initialize ePay client with config
    this.epayClient = {
      merchantId: config.epay.merchantId,
      apiKey: config.epay.apiKey,
      baseURL: config.epay.environment === 'sandbox' ? 
        'https://sandbox.epay.com/api/v1' : 
        'https://api.epay.com/v1'
    };
  }

  async processWithdrawal(userId, amount, method) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    if (user.coins.balance < amount) {
      throw new Error('Saldo insuficiente');
    }

    // Verificar método de pago configurado
    if (!user.paymentInfo[`${method}Account`] && method !== 'paypal') {
      throw new Error(`Cuenta de ${method} no configurada`);
    }

    // Crear transacción pendiente
    const transaction = new Transaction({
      userId: user._id,
      amount,
      currency: 'USD',
      status: 'pending',
      paymentMethod: method,
      paymentIntentId: `${method}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Registrar retiro pendiente
    user.paymentInfo.pendingWithdrawals.push({
      amount,
      method,
      status: 'pending',
      requestDate: new Date()
    });

    // Actualizar balance
    user.coins.balance -= amount;
    user.coins.transactions.push({
      type: 'withdrawal',
      amount: -amount,
      timestamp: new Date(),
      referenceModel: 'Transaction',
      reference: transaction._id
    });

    await Promise.all([transaction.save(), user.save()]);

    // Procesar retiro según método
    try {
      switch (method) {
        case 'paypal':
          await this.processPayPalWithdrawal(user, amount, transaction);
          break;
        case 'binance':
          await this.processBinanceWithdrawal(user, amount, transaction);
          break;
        case 'epay':
          await this.processEpayWithdrawal(user, amount, transaction);
          break;
        default:
          throw new Error('Método de pago no soportado');
      }

      // Actualizar estado de la transacción
      transaction.status = 'succeeded';
      const withdrawalIndex = user.paymentInfo.pendingWithdrawals.findIndex(
        w => w.amount === amount && w.status === 'pending'
      );
      if (withdrawalIndex !== -1) {
        user.paymentInfo.pendingWithdrawals[withdrawalIndex].status = 'completed';
        user.paymentInfo.pendingWithdrawals[withdrawalIndex].completionDate = new Date();
      }

      await Promise.all([transaction.save(), user.save()]);
      return transaction;

    } catch (error) {
      // Revertir cambios en caso de error
      transaction.status = 'failed';
      transaction.errorMessage = error.message;
      transaction.errorCode = error.code || 'PROCESSOR_ERROR';
      user.coins.balance += amount;
      const withdrawalIndex = user.paymentInfo.pendingWithdrawals.findIndex(
        w => w.amount === amount && w.status === 'pending'
      );
      if (withdrawalIndex !== -1) {
        user.paymentInfo.pendingWithdrawals[withdrawalIndex].status = 'failed';
      }

      await Promise.all([transaction.save(), user.save()]);
      throw error;
    }
  }

  async processPayPalWithdrawal(user, amount, transaction) {
    const payoutRequest = new paypal.payouts.PayoutsPostRequest();
    payoutRequest.requestBody({
      sender_batch_header: {
        sender_batch_id: `payout_${transaction._id}`,
        email_subject: 'You have a payment from Marida App',
        email_message: 'You received a payment from your Marida App earnings'
      },
      items: [{
        recipient_type: 'EMAIL',
        amount: {
          value: amount,
          currency: 'USD'
        },
        note: 'Thanks for being part of Marida App!',
        sender_item_id: transaction._id.toString(),
        receiver: user.paymentInfo.paypalAccount || user.email
      }]
    });

    const response = await this.paypalClient.execute(payoutRequest);
    if (response.statusCode !== 201) {
      throw new Error('PayPal payout failed');
    }
    
    transaction.metadata = {
      paypalPayoutId: response.result.batch_header.payout_batch_id,
      paypalStatus: response.result.batch_header.batch_status
    };
  }

  async processBinanceWithdrawal(user, amount, transaction) {
    const response = await this.binanceClient.withdraw(
      'USDT',
      user.paymentInfo.binanceAccount,
      amount,
      {
        network: 'BSC', // Binance Smart Chain for USDT
        walletType: 1 // Spot Wallet
      }
    );

    if (!response.data || !response.data.id) {
      throw new Error('Binance withdrawal failed');
    }

    transaction.metadata = {
      binanceWithdrawId: response.data.id,
      binanceStatus: response.data.status
    };
  }

  async processEpayWithdrawal(user, amount, transaction) {
    const response = await axios.post(`${this.epayClient.baseURL}/payouts`, {
      merchant_id: this.epayClient.merchantId,
      api_key: this.epayClient.apiKey,
      amount: amount,
      currency: 'USD',
      recipient: user.paymentInfo.epayAccount,
      reference: transaction._id.toString(),
      description: 'Marida App Earnings Withdrawal'
    });

    if (!response.data.success) {
      throw new Error('ePay withdrawal failed: ' + response.data.message);
    }

    transaction.metadata = {
      epayTransactionId: response.data.transaction_id,
      epayStatus: response.data.status
    };
  }
}

module.exports = WithdrawalService;