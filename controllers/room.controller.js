const Room = require('../models/room.model');
const User = require('../models/user.model');

class RoomController {
  async createRoom(req, res) {
    try {
      const { name, description, type, capacity, isPrivate, tags } = req.body;
      const room = new Room({
        name,
        description,
        type,
        capacity,
        isPrivate,
        tags,
        owner: req.user.id,
        participants: [{ user: req.user.id, role: 'admin' }]
      });

      await room.save();
      await room.populate('owner', 'name profilePicture');
      
      res.status(201).json(room);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getRooms(req, res) {
    try {
      const { type, status, search } = req.query;
      const query = { status: 'active' };

      if (type) query.type = type;
      if (status) query.status = status;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }

      const rooms = await Room.find(query)
        .populate('owner', 'name profilePicture')
        .sort({ popularityScore: -1, createdAt: -1 })
        .limit(20);

      res.json(rooms);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async joinRoom(req, res) {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }

      if (room.activeParticipants >= room.capacity) {
        return res.status(400).json({ message: 'La sala está llena' });
      }

      const participantExists = room.participants.some(
        p => p.user.toString() === req.user.id
      );

      if (!participantExists) {
        room.participants.push({
          user: req.user.id,
          role: 'user'
        });
      }

      room.activeParticipants += 1;
      await room.save();
      
      res.json(room);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async leaveRoom(req, res) {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }

      room.activeParticipants = Math.max(0, room.activeParticipants - 1);
      await room.save();

      res.json({ message: 'Has abandonado la sala exitosamente' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateRoom(req, res) {
    try {
      const room = await Room.findById(req.params.roomId);
      if (!room) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }

      if (room.owner.toString() !== req.user.id) {
        return res.status(403).json({ message: 'No tienes permiso para actualizar esta sala' });
      }

      const updates = req.body;
      Object.keys(updates).forEach(key => {
        if (key !== 'owner' && key !== 'participants' && key !== 'activeParticipants') {
          room[key] = updates[key];
        }
      });

      await room.save();
      res.json(room);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new RoomController();