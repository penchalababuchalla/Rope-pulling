const express = require('express');
const gameController = require('../controllers/gameController');

const router = express.Router();

router.post('/startgame', gameController.startGame);
router.get('/game/:id', gameController.getGameById);
router.post('/game/:id/answer', gameController.submitAnswer);
router.get('/game/:id/problem', gameController.getProblem);

module.exports = router;
