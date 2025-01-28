const express = require('express');
const router = express.Router();
const WithdrawalController = require('../../controllers/payment/withdrawal.controller');
const { authMiddleware } = require('../../middlewares/auth.middleware');
const { roleMiddleware } = require('../../middlewares/role.middleware');

// Middleware para verificar roles y permisos
const verifyWithdrawalPermissions = roleMiddleware(['user', 'emitter', 'agency_owner']);

// Rutas de retiro
router.post('/request', 
  authMiddleware, 
  verifyWithdrawalPermissions,
  WithdrawalController.requestWithdrawal
);

router.get('/history', 
  authMiddleware, 
  verifyWithdrawalPermissions,
  WithdrawalController.getWithdrawalHistory
);

router.post('/cancel/:withdrawalId', 
  authMiddleware, 
  verifyWithdrawalPermissions,
  WithdrawalController.cancelWithdrawal
);

module.exports = router;