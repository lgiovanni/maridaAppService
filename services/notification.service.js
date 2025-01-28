const Notification = require('../models/notification.model');
const ModerationLog = require('../models/moderationLog.model');
const User = require('../models/user.model');

class NotificationService {
  constructor(webSocketService) {
    this.wss = webSocketService;
  }

  async createNotification(data) {
    const notification = new Notification(data);
    await notification.save();

    // Send real-time notification if recipient is online
    this.wss.broadcastToUser(notification.recipient, {
      type: 'notification',
      data: notification
    });

    return notification;
  }

  async getUserNotifications(userId, query = {}) {
    const { page = 1, limit = 20, read } = query;
    const skip = (page - 1) * limit;

    const filter = { recipient: userId };
    if (read !== undefined) filter.read = read;

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'name profilePicture'),
      Notification.countDocuments(filter)
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    };
  }

  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    return notification;
  }

  async markAllAsRead(userId) {
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
  }

  // Friend system notifications
  async sendFriendRequest(senderId, recipientId) {
    return this.createNotification({
      type: 'FRIEND_REQUEST',
      sender: senderId,
      recipient: recipientId,
      content: 'sent you a friend request',
      actionUrl: `/profile/${senderId}`
    });
  }

  async acceptFriendRequest(senderId, recipientId) {
    return this.createNotification({
      type: 'FRIEND_ACCEPT',
      sender: senderId,
      recipient: recipientId,
      content: 'accepted your friend request',
      actionUrl: `/profile/${senderId}`
    });
  }

  // Moderation system
  async createModerationLog(data) {
    const log = new ModerationLog(data);
    await log.save();

    // If action requires user notification
    if (['WARNING', 'MUTE', 'TEMPORARY_BAN', 'PERMANENT_BAN'].includes(data.action)) {
      await this.createNotification({
        type: 'CONTENT_WARNING',
        recipient: data.targetId,
        content: `Your account has received a ${data.action.toLowerCase()}: ${data.reason}`,
        metadata: {
          moderationLogId: log._id,
          action: data.action
        }
      });
    }

    return log;
  }

  async getModerationLogs(query = {}) {
    const { page = 1, limit = 20, targetType, status } = query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (targetType) filter.targetType = targetType;
    if (status) filter.status = status;

    const [logs, total] = await Promise.all([
      ModerationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('moderator', 'name')
        .populate('targetId'),
      ModerationLog.countDocuments(filter)
    ]);

    return {
      logs,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Analytics helpers
  async getNotificationStats(userId) {
    const [total, unread] = await Promise.all([
      Notification.countDocuments({ recipient: userId }),
      Notification.countDocuments({ recipient: userId, read: false })
    ]);

    return { total, unread };
  }

  async getModerationStats(period = 30) { // Default last 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const stats = await ModerationLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      }
    ]);

    return stats.reduce((acc, curr) => {
      acc[curr._id.toLowerCase()] = curr.count;
      return acc;
    }, {});
  }
}

module.exports = NotificationService;