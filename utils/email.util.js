const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }

  async sendEmail({ to, subject, text, html }) {
    if (!config.email.auth.user || !config.email.auth.pass) {
      throw new Error('Email credentials are not configured');
    }

    return this.transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html
    });
  }
}

module.exports = EmailService;