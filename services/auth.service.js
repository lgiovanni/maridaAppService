const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/config');
const EmailService = require('../utils/email.util');
const { sendSMS } = require('../utils/sms.util');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

class AuthService {
  constructor() {
    this.googleClient = new OAuth2Client(config.google.clientId);
    this.emailService = new EmailService();
  }

  generateToken(userId) {
    return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
  }

  async registerWithEmail(userData) {
    try {
      // Check if email already exists
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('El correo electrónico ya está registrado');
      }

      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      await this.emailService.sendEmail({
        to: userData.email,
        subject: 'Verifica tu cuenta',
        text: `Tu código de verificación es: ${verificationCode}`
      });

      // Only create user if email was sent successfully
      const user = await User.create({
        ...userData,
        name: userData.username,  // Map username to name field
        authType: 'email',
        verified: false,
        verificationCode,
        verificationCodeExpires: new Date(Date.now() + 30 * 60000) // 30 minutes
      });

      return user;
    } catch (error) {
      // If it's our specific error for existing email, throw it directly
      if (error.message === 'El correo electrónico ya está registrado') {
        throw error;
      }
      // For any other errors, throw the generic error
      throw new Error('Lo sentimos, estamos experimentando dificultades técnicas. Por favor, inténtalo de nuevo más tarde.');
    }
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

  async login(identifier, password) {
    try {
      const user = await User.findOne({
        $or: [
          { email: identifier },
          { phoneNumber: identifier }
        ]
      }).select('+password');

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      if (!user.verified) {
        throw new Error('Por favor verifica tu cuenta antes de iniciar sesión');
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        throw new Error('Contraseña incorrecta');
      }

      user.lastLogin = new Date();
      await user.save();

      return this.generateToken(user._id);
    } catch (error) {
      throw error;
    }
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