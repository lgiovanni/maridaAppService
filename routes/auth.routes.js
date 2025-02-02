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

// Login por email o teléfono
router.post('/login',
  authValidationRules.login,
  validateRequest,
  async (req, res, next) => {
    try {
      const { identifier, password } = req.body;
      const token = await authService.login(identifier, password);
      res.json({
        message: 'Inicio de sesión exitoso',
        token
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login con Google
router.post('/login/google',
  async (req, res, next) => {
    try {
      const { token } = req.body;
      const authToken = await authService.loginWithGoogle(token);
      res.json({
        message: 'Inicio de sesión con Google exitoso',
        token: authToken
      });
    } catch (error) {
      next(error);
    }
  }
);

// Login con Facebook
router.post('/login/facebook',
  async (req, res, next) => {
    try {
      const { accessToken } = req.body;
      const token = await authService.loginWithFacebook(accessToken);
      res.json({
        message: 'Inicio de sesión con Facebook exitoso',
        token
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;