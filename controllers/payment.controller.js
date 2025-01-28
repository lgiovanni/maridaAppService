const PaymentService = require('../services/payment.service');

class PaymentController {
  async createPaymentIntent(req, res) {
    try {
      const { amount, currency, paymentMethodTypes } = req.body;
      const result = await PaymentService.createPaymentIntent(
        req.user.id,
        amount,
        currency,
        paymentMethodTypes
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async createSetupIntent(req, res) {
    try {
      const result = await PaymentService.createSetupIntent(req.user.id);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listPaymentMethods(req, res) {
    try {
      const paymentMethods = await PaymentService.listPaymentMethods(req.user.id);
      res.json(paymentMethods);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async handleWebhook(req, res) {
    try {
      await PaymentService.handleWebhook(req.body);
      res.json({ received: true });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new PaymentController();