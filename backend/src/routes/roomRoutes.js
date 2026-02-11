const express = require('express');
const roomController = require('../controllers/roomController');

const router = express.Router();

router.post('/rooms', roomController.createRoom);
router.get('/rooms/code/:code', roomController.getRoomByCode);
router.post('/rooms/code/:code/join', roomController.joinRoom);

module.exports = router;
