const { body, validationResult } = require('express-validator');
const express = require('express');

const validateRequest = (req, res, next) => {
  // Ensure proper content type for POST requests
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      errors: [{
        type: 'content-type',
        msg: 'Content-Type must be application/json'
      }]
    });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      errors: [{
        type: 'body',
        msg: 'Request body is empty or not properly formatted'
      }]
    });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const authValidationRules = {
  register: [
    body('email')
      .if(body('phoneNumber').not().exists())
      .exists()
      .withMessage('El email es requerido')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El email es requerido')
      .isEmail()
      .withMessage('Email inválido')
      .normalizeEmail(),
    body('phoneNumber')
      .if(body('email').not().exists())
      .exists()
      .withMessage('El número de teléfono es requerido')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El número de teléfono es requerido')
      .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Número de teléfono inválido'),
    body('password')
      .exists()
      .withMessage('La contraseña es requerida')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('La contraseña es requerida')
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('username')
      .exists()
      .withMessage('El nombre de usuario es requerido')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El nombre de usuario es requerido')
      .isLength({ min: 3 })
      .withMessage('El nombre de usuario debe tener al menos 3 caracteres')
  ],
  login: [
    body('identifier')
      .exists()
      .withMessage('El identificador es requerido')
      .bail()
      .trim()
      .notEmpty()
      .withMessage('El identificador es requerido')
      .custom((value) => {
        // Check if value is a valid email or phone number
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        const isPhone = /^\+?[1-9]\d{1,14}$/.test(value);
        if (!isEmail && !isPhone) {
          throw new Error('Identificador inválido. Debe ser un email o número de teléfono válido');
        }
        return true;
      }),
    body('password')
      .notEmpty()
      .withMessage('La contraseña es requerida')
  ]
};

module.exports = {
  validateRequest,
  authValidationRules
};