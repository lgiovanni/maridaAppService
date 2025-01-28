const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

class WebSocketService {
  constructor(server) {
    this.wss = new WebSocket.Server({ server });
    this.rooms = new Map(); // roomId -> Set of WebSocket connections
    this.userRooms = new Map(); // userId -> Set of roomIds
    this.roomTypes = new Map(); // roomId -> room type (chat, voice, video)
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Authenticate user from token
        const token = req.url.split('token=')[1];
        if (!token) {
          ws.close(4001, 'No authentication token provided');
          return;
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        ws.userId = decoded.user.id;

        // Handle incoming messages
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(ws, message);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message format'
            }));
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.handleDisconnect(ws);
        });

      } catch (error) {
        ws.close(4002, 'Authentication failed');
      }
    });
  }

  handleMessage(ws, message) {
    switch (message.type) {
      case 'join_room':
        this.joinRoom(ws, message.roomId, message.roomType);
        break;
      case 'leave_room':
        this.leaveRoom(ws, message.roomId);
        break;
      case 'chat_message':
        this.handleChatMessage(ws, message);
        break;
      case 'stream_signal':
        this.forwardStreamSignal(message);
        break;
      case 'gift_animation':
        this.handleGiftAnimation(ws, message);
        break;
      case 'user_typing':
        this.handleUserTyping(ws, message);
        break;
      case 'stream_status':
        this.handleStreamStatus(ws, message);
        break;
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type'
        }));
    }
  }

  joinRoom(ws, roomId, roomType = 'chat') {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
      this.roomTypes.set(roomId, roomType);
    }

    this.rooms.get(roomId).add(ws);
    ws.currentRoom = roomId;

    // Track user's rooms
    if (!this.userRooms.has(ws.userId)) {
      this.userRooms.set(ws.userId, new Set());
    }
    this.userRooms.get(ws.userId).add(roomId);

    // Get current participants
    const participants = Array.from(this.rooms.get(roomId)).map(client => ({
      userId: client.userId,
      status: client.streamStatus || 'inactive'
    }));

    // Send room info to joining user
    ws.send(JSON.stringify({
      type: 'room_info',
      roomType,
      participants
    }));

    // Notify others in room
    this.broadcastToRoom(roomId, {
        type: 'user_joined',
        userId: ws.userId,
        timestamp: new Date()
      });
    }

  leaveRoom(ws, roomId) {
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(ws);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }
    ws.currentRoom = null;

    // Notify others in room
    this.broadcastToRoom(roomId, {
      type: 'user_left',
      userId: ws.userId
    });
  }

  handleDisconnect(ws) {
    if (ws.currentRoom) {
      this.leaveRoom(ws, ws.currentRoom);
    }
  }

  broadcastToRoom(roomId, message) {
    if (!this.rooms.has(roomId)) return;

    const messageStr = JSON.stringify(message);
    this.rooms.get(roomId).forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  forwardStreamSignal(message) {
    if (!this.rooms.has(message.roomId)) return;

    const signalMessage = JSON.stringify({
      type: 'stream_signal',
      from: message.from,
      signal: message.signal
    });

    this.rooms.get(message.roomId).forEach(client => {
      if (client.userId === message.to && client.readyState === WebSocket.OPEN) {
        client.send(signalMessage);
      }
    });
  }

  handleChatMessage(ws, message) {
    this.broadcastToRoom(message.roomId, {
      type: 'chat_message',
      userId: ws.userId,
      content: message.content,
      timestamp: new Date()
    });
  }

  handleGiftAnimation(ws, message) {
    this.broadcastToRoom(message.roomId, {
      type: 'gift_animation',
      userId: ws.userId,
      giftId: message.giftId,
      recipientId: message.recipientId,
      timestamp: new Date()
    });
  }

  handleUserTyping(ws, message) {
    this.broadcastToRoom(message.roomId, {
      type: 'user_typing',
      userId: ws.userId,
      isTyping: message.isTyping,
      timestamp: new Date()
    });
  }

  handleStreamStatus(ws, message) {
    ws.streamStatus = message.status;
    this.broadcastToRoom(message.roomId, {
      type: 'stream_status',
      userId: ws.userId,
      status: message.status,
      timestamp: new Date()
    });
  }
}

module.exports = WebSocketService;