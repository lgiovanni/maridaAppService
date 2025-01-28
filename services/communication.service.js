const RateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const config = require('../config/config');
const CommunicationLog = require('../models/communicationLog.model');
const { sendEmail } = require('../utils/email.util');
const { sendSMS } = require('../utils/sms.util');

class CommunicationService {
  constructor() {
    this.redis = new Redis(config.redis);
    this.maxRetries = 3;
    this.retryDelays = [5000, 15000, 30000]; // Delays en milisegundos
  }

  // Rate limiting por usuario y tipo
  async checkRateLimit(userId, type) {
    const key = `rateLimit:${type}:${userId}`;
    const limit = type === 'EMAIL' ? 5 : 3; // Límites por hora
    const window = 3600; // 1 hora en segundos

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, window);
    }

    if (current > limit) {
      throw new Error(`Rate limit exceeded for ${type}`);
    }
  }

  // Crear log de comunicación
  async createLog(data) {
    return await CommunicationLog.create({
      ...data,
      status: 'PENDING',
      attempts: 0
    });
  }

  // Actualizar log después de un intento
  async updateLog(logId, status, error = null) {
    const update = {
      status,
      lastAttempt: new Date(),
      $inc: { attempts: 1 }
    };
    
    if (error) {
      update.error = error.message;
    }

    return await CommunicationLog.findByIdAndUpdate(logId, update, { new: true });
  }

  // Sistema de reintento con backoff exponencial
  async retry(logId, type, recipient, content) {
    const log = await CommunicationLog.findById(logId);
    
    if (log.attempts >= this.maxRetries) {
      await this.updateLog(logId, 'FAILED');
      throw new Error(`Max retries exceeded for ${type} to ${recipient}`);
    }

    const delay = this.retryDelays[log.attempts];
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.send(type, recipient, content, log.purpose, log.userId, logId);
  }

  // Método principal de envío
  async send(type, recipient, content, purpose, userId, existingLogId = null) {
    // Verificar rate limit
    await this.checkRateLimit(userId, type);

    // Crear o recuperar log
    const log = existingLogId ?
      await CommunicationLog.findById(existingLogId) :
      await this.createLog({
        type,
        recipient,
        content,
        purpose,
        userId
      });

    try {
      if (type === 'EMAIL') {
        await sendEmail({
          to: recipient,
          subject: purpose,
          text: content
        });
      } else if (type === 'SMS') {
        await sendSMS({
          to: recipient,
          message: content
        });
      }

      await this.updateLog(log._id, 'SENT');
      return { success: true, logId: log._id };

    } catch (error) {
      await this.updateLog(log._id, 'RETRYING', error);
      
      // Iniciar proceso de reintento
      return this.retry(log._id, type, recipient, content)
        .catch(async (retryError) => {
          await this.updateLog(log._id, 'FAILED', retryError);
          throw retryError;
        });
    }
  }

  // Método para obtener estadísticas
  async getStats(userId, type, startDate, endDate) {
    const match = {
      userId,
      ...(type && { type }),
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    return await CommunicationLog.aggregate([
      { $match: match },
      { $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgAttempts: { $avg: '$attempts' }
      }}
    ]);
  }

  // Limpieza de logs antiguos
  async cleanOldLogs(daysToKeep = 30) {
    const date = new Date();
    date.setDate(date.getDate() - daysToKeep);

    await CommunicationLog.deleteMany({
      createdAt: { $lt: date },
      status: { $in: ['SENT', 'FAILED'] }
    });
  }
}

module.exports = new CommunicationService();