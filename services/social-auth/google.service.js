const { OAuth2Client } = require('google-auth-library');
const config = require('../../config/config');
const User = require('../../models/user.model');

class GoogleAuthService {
  constructor() {
    this.client = new OAuth2Client({
      clientId: config.google.clientId,
      clientSecret: config.google.clientSecret,
      redirectUri: config.google.redirectUri
    });
  }

  async getAuthUrl() {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ]
    });
  }

  async verifyToken(token) {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: config.google.clientId
      });
      return ticket.getPayload();
    } catch (error) {
      throw new Error('Token de Google inválido');
    }
  }

  async handleCallback(code) {
    try {
      const { tokens } = await this.client.getToken(code);
      const userData = await this.verifyToken(tokens.id_token);
      return this.findOrCreateUser(userData);
    } catch (error) {
      throw new Error('Error en la autenticación con Google');
    }
  }

  async findOrCreateUser(userData) {
    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified
    } = userData;

    let user = await User.findOne({
      $or: [
        { 'social.google.id': googleId },
        { email }
      ]
    });

    if (user) {
      // Actualizar información si es necesario
      user.social.google = {
        id: googleId,
        email,
        picture
      };
      user.lastLogin = new Date();
      await user.save();
      return user;
    }

    // Crear nuevo usuario
    user = new User({
      email,
      name,
      profilePicture: picture,
      verified: email_verified,
      authType: 'social',
      social: {
        google: {
          id: googleId,
          email,
          picture
        }
      }
    });

    await user.save();
    return user;
  }
}

module.exports = GoogleAuthService;