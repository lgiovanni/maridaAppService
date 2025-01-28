const WithdrawalService = require('../../services/payment/withdrawal.service');
const { validateWithdrawalRequest } = require('../../utils/validators/payment.validator');

class WithdrawalController {
  async requestWithdrawal(req, res, next) {
    try {
      // Verificar permisos
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { amount, method } = req.body;

      // Validar solicitud
      const validationError = validateWithdrawalRequest(amount, method);
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      // Procesar retiro
      const transaction = await WithdrawalService.processWithdrawal(
        req.user._id,
        amount,
        method
      );

      res.status(200).json({
        message: 'Solicitud de retiro procesada exitosamente',
        transaction
      });
    } catch (error) {
      next(error);
    }
  }

  async getWithdrawalHistory(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const withdrawals = req.user.paymentInfo.pendingWithdrawals;
      res.status(200).json(withdrawals);
    } catch (error) {
      next(error);
    }
  }

  async cancelWithdrawal(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const { withdrawalId } = req.params;
      const withdrawal = req.user.paymentInfo.pendingWithdrawals.id(withdrawalId);

      if (!withdrawal) {
        return res.status(404).json({ message: 'Retiro no encontrado' });
      }

      if (withdrawal.status !== 'pending') {
        return res.status(400).json({
          message: 'Solo se pueden cancelar retiros pendientes'
        });
      }

      withdrawal.status = 'cancelled';
      await req.user.save();

      res.status(200).json({
        message: 'Retiro cancelado exitosamente',
        withdrawal
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WithdrawalController();