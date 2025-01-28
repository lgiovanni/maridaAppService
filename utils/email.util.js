const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });
  }

  async sendEmail({ to, subject, text, html }) {
    return this.transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      text,
      html
    });
  }
}

module.exports = new EmailService();