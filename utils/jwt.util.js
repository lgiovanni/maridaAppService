const jwt = require('jsonwebtoken');
const config = require('../config/config');

exports.generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      authType: user.authType
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};