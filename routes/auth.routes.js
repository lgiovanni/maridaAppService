const express = require('express');
const router = express.Router();
const AuthService = require('../services/auth.service');
const { validateRequest, authValidationRules } = require('../middlewares/validator.middleware');

// Apply JSON parsing middleware
router.use(express.json());

// Initialize AuthService
const authService = new AuthService();

// Registro por email
router.post('/register/email',
  authValidationRules.register,
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await authService.registerWithEmail(req.body);
      res.status(201).json({
        message: 'Usuario registrado. Por favor verifica tu email'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Registro por teléfono
router.post('/register/phone',
  authValidationRules.register,
  validateRequest,
  async (req, res, next) => {
    try {
      const user = await authService.registerWithPhone(req.body);
      res.status(201).json({
        message: 'Usuario registrado. Por favor verifica tu número de teléfono'
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verificación de código
router.post('/verify-code',
  async (req, res, next) => {
    try {
      const { identifier, code } = req.body;
      const token = await authService.verifyCode(identifier, code);
      res.json({ token });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;