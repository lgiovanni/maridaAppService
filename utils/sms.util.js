const twilio = require('twilio');
const config = require('../config/config');

class SMSService {
  constructor() {
    this.client = twilio(
      config.twilio.accountSid,
      config.twilio.authToken
    );
  }

  async sendSMS({ to, message }) {
    return this.client.messages.create({
      body: message,
      from: config.twilio.phoneNumber,
      to
    });
  }
}

module.exports = new SMSService();
