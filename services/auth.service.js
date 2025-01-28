const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/config');
const { sendEmail } = require('../utils/email.util');
const { sendSMS } = require('../utils/sms.util');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

class AuthService {
  constructor() {
    this.googleClient = new OAuth2Client(config.google.clientId);
  }

  generateToken(userId) {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
  }

  async registerWithEmail(userData) {
    const user = await User.create({
      ...userData,
      authType: 'email',
      verified: false
    });

    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Enviar email de verificación
    await sendEmail({
      to: user.email,
      subject: 'Verifica tu cuenta',
      text: `Tu código de verificación es: ${verificationCode}`
    });

    return user;
  }

  async registerWithPhone(userData) {
    const user = await User.create({
      ...userData,
      authType: 'phone',
      verified: false
    });

    const verificationCode = user.generateVerificationCode();
    await user.save();

    // Enviar SMS de verificación
    await sendSMS({
      to: user.phoneNumber,
      message: `Tu código de verificación es: ${verificationCode}`
    });

    return user;
  }

  async verifyCode(identifier, code) {
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phoneNumber: identifier }
      ],
      verificationCode: code,
      verificationCodeExpires: { $gt: Date.now() }
    });

    if (!user) {
      throw new Error('Código inválido o expirado');
    }

    user.verified = true;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    return this.generateToken(user._id);
  }

  async loginWithGoogle(token) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: token,
      audience: config.google.clientId
    });
    
    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ 
      $or: [
        { oauthId: googleId, oauthProvider: 'google' },
        { email }
      ]
    });

    if (!user) {
      user = new User({
        email,
        name,
        profilePicture: picture,
        authType: 'google',
        oauthProvider: 'google',
        oauthId: googleId,
        verified: true
      });
    } else if (user.oauthProvider !== 'google') {
      throw new Error('Este email ya está registrado con otro método de autenticación');
    }

    user.lastLogin = new Date();
    await user.save();

    return this.generateToken(user._id);
  }

  async loginWithFacebook(accessToken) {
    const { data } = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token: accessToken
      }
    });

    let user = await User.findOne({
      $or: [
        { oauthId: data.id, oauthProvider: 'facebook' },
        { email: data.email }
      ]
    });

    if (!user) {
      user = new User({
        email: data.email,
        name: data.name,
        profilePicture: data.picture?.data?.url,
        authType: 'facebook',
        oauthProvider: 'facebook',
        oauthId: data.id,
        verified: true
      });
    } else if (user.oauthProvider !== 'facebook') {
      throw new Error('Este email ya está registrado con otro método de autenticación');
    }

    user.lastLogin = new Date();
    await user.save();

    return this.generateToken(user._id);
  }
}

module.exports = AuthService;