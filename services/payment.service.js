const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/user.model');
const Transaction = require('../models/transaction.model');

class PaymentService {
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Stripe secret key is not configured');
    }
    this.COINS_PER_USD = process.env.COINS_PER_USD || 100; // Default 100 coins per USD
  }

  async createPaymentIntent(userId, amount, currency = 'usd', paymentMethodTypes = ['card']) {
    try {
      // Validate amount
      if (amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        payment_method_types: paymentMethodTypes,
        customer: await this.getOrCreateStripeCustomer(user),
        metadata: {
          userId: user._id.toString()
        }
      });

      // Create transaction record
      await Transaction.create({
        userId: user._id,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency,
        status: 'pending',
        paymentMethod: paymentMethodTypes[0]
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      };
    } catch (error) {
      throw new Error(`Error creating payment intent: ${error.message}`);
    }
  }

  async handleWebhook(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handleSuccessfulPayment(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object);
          break;
      }
    } catch (error) {
      throw new Error(`Error handling webhook: ${error.message}`);
    }
  }

  async handleSuccessfulPayment(paymentIntent) {
    const transaction = await Transaction.findOne({ paymentIntentId: paymentIntent.id });
    if (!transaction) return;

    try {
      // Update transaction status
      transaction.status = 'succeeded';
      transaction.metadata = {
        ...transaction.metadata,
        stripeResponse: paymentIntent,
        processedAt: new Date()
      };
      await transaction.save();

      // Find the user
      const user = await User.findById(transaction.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Calculate and add coins based on payment amount
      const coinsToAdd = Math.floor(transaction.amount * this.COINS_PER_USD);
      user.coins.balance += coinsToAdd;
      user.coins.transactions.push({
        type: 'purchase',
        amount: coinsToAdd,
        timestamp: new Date(),
        reference: transaction._id,
        referenceModel: 'Transaction'
      });
      await user.save();

      // Create a communication log for the successful payment
      const CommunicationLog = require('../models/communicationLog.model');
      await CommunicationLog.create({
        userId: user._id,
        type: 'PAYMENT_SUCCESS',
        message: `Payment successful! Amount: ${transaction.currency.toUpperCase()} ${transaction.amount}`,
        metadata: {
          transactionId: transaction._id,
          paymentIntentId: paymentIntent.id,
          amount: transaction.amount,
          currency: transaction.currency
        }
      });

      // You can add more success handling logic here, such as:
      // - Updating user's subscription status
      // - Triggering related business processes
      // - Sending email confirmation
      // - Updating inventory or order status
    } catch (error) {
      console.error('Error in handleSuccessfulPayment:', error);
      // Even if notification fails, the payment was still successful
      // We might want to queue these notifications for retry
    }
  }

  async handleFailedPayment(paymentIntent) {
    const transaction = await Transaction.findOne({ paymentIntentId: paymentIntent.id });
    if (!transaction) return;

    transaction.status = 'failed';
    transaction.errorCode = paymentIntent.last_payment_error?.code;
    transaction.errorMessage = this.getClientFriendlyErrorMessage(paymentIntent.last_payment_error);
    transaction.metadata = {
      ...transaction.metadata,
      stripeResponse: paymentIntent
    };
    await transaction.save();
  }

  getClientFriendlyErrorMessage(error) {
    if (!error) return 'An unknown error occurred';

    switch (error.code) {
      case 'card_declined':
        return 'Your card was declined. Please try a different card.';
      case 'expired_card':
        return 'Your card has expired. Please use a different card.';
      case 'incorrect_cvc':
        return 'The security code (CVC) is incorrect. Please check and try again.';
      case 'insufficient_funds':
        return 'Your card has insufficient funds. Please use a different payment method.';
      default:
        return error.message || 'An error occurred processing your payment.';
    }
  }

  async getOrCreateStripeCustomer(user) {
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: user._id.toString()
      }
    });

    user.stripeCustomerId = customer.id;
    await user.save();

    return customer.id;
  }

  async createSetupIntent(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const setupIntent = await stripe.setupIntents.create({
        customer: await this.getOrCreateStripeCustomer(user),
        payment_method_types: ['card', 'google_pay', 'apple_pay'],
      });

      return {
        clientSecret: setupIntent.client_secret
      };
    } catch (error) {
      throw new Error(`Error creating setup intent: ${error.message}`);
    }
  }

  async listPaymentMethods(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const paymentMethods = await stripe.paymentMethods.list({
        customer: await this.getOrCreateStripeCustomer(user),
        type: 'card'
      });

      return paymentMethods.data;
    } catch (error) {
      throw new Error(`Error listing payment methods: ${error.message}`);
    }
  }
}

module.exports = new PaymentService();