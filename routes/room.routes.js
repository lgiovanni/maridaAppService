const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/room.controller');
const auth = require('../middlewares/auth.middleware');

// Proteger todas las rutas con autenticación
router.use(auth);

// Rutas para gestión de salas
router.post('/', RoomController.createRoom);
router.get('/', RoomController.getRooms);
router.post('/:roomId/join', RoomController.joinRoom);
router.post('/:roomId/leave', RoomController.leaveRoom);
router.put('/:roomId', RoomController.updateRoom);

module.exports = router;