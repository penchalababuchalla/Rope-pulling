const { createGame, getGame } = require('../models/Game');

/**
 * POST /api/startgame
 * Body: { selectedNumbers?: number[], problemType?: string, playMode?: 'computer'|'friend' }
 */
function startGame(req, res) {
  try {
    const { selectedNumbers, problemType, playMode } = req.body || {};
    const game = createGame({
      selectedNumbers,
      problemType,
      playMode,
    });
    const payload = game.getPublicState();
    res.status(201).json(payload);
  } catch (err) {
    console.error('startGame error:', err);
    res.status(500).json({ error: 'Failed to start game' });
  }
}

/**
 * GET /api/game/:id
 */
function getGameById(req, res) {
  try {
    const game = getGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game.getPublicState());
  } catch (err) {
    console.error('getGameById error:', err);
    res.status(500).json({ error: 'Failed to get game' });
  }
}

/**
 * POST /api/game/:id/answer
 * Body: { team: 'team1'|'team2', answer: number }
 */
function submitAnswer(req, res) {
  try {
    const game = getGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const { team, answer } = req.body || {};
    if (!team || (team !== 'team1' && team !== 'team2')) {
      return res.status(400).json({ error: 'Invalid or missing team' });
    }
    const result = game.submitAnswer(team, answer);
    if (result.error) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('submitAnswer error:', err);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
}

/**
 * GET /api/game/:id/problem?team=team1|team2
 * Optional: get current problem for a team (e.g. after page refresh).
 */
function getProblem(req, res) {
  try {
    const game = getGame(req.params.id);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    const team = req.query.team;
    if (!team || (team !== 'team1' && team !== 'team2')) {
      return res.status(400).json({ error: 'Invalid or missing team query' });
    }
    const problem = game.getNextProblem(team);
    res.json({ problem });
  } catch (err) {
    console.error('getProblem error:', err);
    res.status(500).json({ error: 'Failed to get problem' });
  }
}

module.exports = {
  startGame,
  getGameById,
  submitAnswer,
  getProblem,
};
