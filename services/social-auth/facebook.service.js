const axios = require('axios');
const config = require('../../config/config');
const User = require('../../models/user.model');

class FacebookAuthService {
  constructor() {
    this.appId = config.facebook.appId;
    this.appSecret = config.facebook.appSecret;
    this.redirectUri = config.facebook.redirectUri;
  }

  getAuthUrl() {
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.redirectUri,
      scope: 'email,public_profile',
      response_type: 'code',
      auth_type: 'rerequest',
      display: 'popup'
    });

    return `https://www.facebook.com/v12.0/dialog/oauth?${params.toString()}`;
  }

  async getAccessToken(code) {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: this.redirectUri,
      code
    });

    const response = await axios.get(
      `https://graph.facebook.com/v12.0/oauth/access_token?${params.toString()}`
    );

    return response.data.access_token;
  }

  async getUserData(accessToken) {
    const response = await axios.get('https://graph.facebook.com/me', {
      params: {
        fields: 'id,name,email,picture',
        access_token: accessToken
      }
    });
    return response.data;
  }

  async handleCallback(code) {
    try {
      const accessToken = await this.getAccessToken(code);
      const userData = await this.getUserData(accessToken);
      return this.findOrCreateUser(userData);
    } catch (error) {
      throw new Error('Error en la autenticación con Facebook');
    }
  }

  async findOrCreateUser(userData) {
    const {
      id: facebookId,
      email,
      name,
      picture
    } = userData;

    let user = await User.findOne({
      $or: [
        { 'social.facebook.id': facebookId },
        { email }
      ]
    });

    if (user) {
      // Actualizar información si es necesario
      user.social.facebook = {
        id: facebookId,
        email,
        picture: picture?.data?.url
      };
      user.lastLogin = new Date();
      await user.save();
      return user;
    }

    // Crear nuevo usuario
    user = new User({
      email,
      name,
      profilePicture: picture?.data?.url,
      verified: true, // Facebook ya verifica los emails
      authType: 'social',
      social: {
        facebook: {
          id: facebookId,
          email,
          picture: picture?.data?.url
        }
      }
    });

    await user.save();
    return user;
  }
}

module.exports = FacebookAuthService;