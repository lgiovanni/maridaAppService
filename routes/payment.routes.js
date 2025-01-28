const express = require('express');
const router = express.Router();
const PaymentController = require('../controllers/payment.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Protected payment routes
router.use(authMiddleware);

// Create payment intent
router.post('/create-payment-intent', PaymentController.createPaymentIntent);

// Setup payment method
router.post('/setup-intent', PaymentController.createSetupIntent);

// List saved payment methods
router.get('/payment-methods', PaymentController.listPaymentMethods);

// Stripe webhook handler (no auth required)
router.post('/webhook', PaymentController.handleWebhook);

module.exports = router;