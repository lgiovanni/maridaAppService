const express = require('express');
const router = express.Router();
const GoogleAuthService = require('../services/social-auth/google.service');
const FacebookAuthService = require('../services/social-auth/facebook.service');
const { generateToken } = require('../utils/jwt.util');

const googleAuth = new GoogleAuthService();
const facebookAuth = new FacebookAuthService();

// Rutas de Google
router.get('/google/url', (req, res) => {
  const url = googleAuth.getAuthUrl();
  res.json({ url });
});

router.post('/google/callback', async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await googleAuth.handleCallback(code);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

// Rutas de Facebook
router.get('/facebook/url', (req, res) => {
  const url = facebookAuth.getAuthUrl();
  res.json({ url });
});

router.post('/facebook/callback', async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = await facebookAuth.handleCallback(code);
    const token = generateToken(user);
    res.json({ token, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
