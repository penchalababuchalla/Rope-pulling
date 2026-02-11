const { v4: uuidv4 } = require('uuid');

const ROPE_STEP = 10;
const MIN_POSITION = 0;
const MAX_POSITION = 100;

const problemTypes = ['multiply', 'divide', 'add', 'subtract', 'both', 'all'];
const playModes = ['computer', 'friend'];

/**
 * In-memory store: gameId -> game instance
 */
const games = new Map();

/**
 * Generate a math problem from config (mirrors frontend StartGameComponent logic).
 * @param {object} config - { selectedNumbers: number[], problemType: string }
 * @returns {{ text: string, answer: number, type: string }}
 */
function generateProblem(config) {
  const { selectedNumbers, problemType } = config;
  const numbers = Array.isArray(selectedNumbers) && selectedNumbers.length
    ? selectedNumbers
    : [2, 3, 4, 5];
  const type = pickOperation(problemType);
  const a = numbers[Math.floor(Math.random() * numbers.length)];
  const b = numbers[Math.floor(Math.random() * numbers.length)];

  switch (type) {
    case 'multiply':
      return { text: `${a} × ${b} = ?`, answer: a * b, type: 'multiply' };
    case 'divide': {
      const product = a * b;
      return { text: `${product} ÷ ${a} = ?`, answer: b, type: 'divide' };
    }
    case 'add':
      return { text: `${a} + ${b} = ?`, answer: a + b, type: 'add' };
    case 'subtract': {
      const big = Math.max(a, b);
      const small = Math.min(a, b);
      return { text: `${big} − ${small} = ?`, answer: big - small, type: 'subtract' };
    }
    default:
      return { text: `${a} × ${b} = ?`, answer: a * b, type: 'multiply' };
  }
}

function pickOperation(problemType) {
  const t = problemType || 'multiply';
  if (t === 'multiply') return 'multiply';
  if (t === 'divide') return 'divide';
  if (t === 'add') return 'add';
  if (t === 'subtract') return 'subtract';
  if (t === 'both') return Math.random() > 0.5 ? 'multiply' : 'divide';
  const r = Math.random();
  if (r < 0.25) return 'multiply';
  if (r < 0.5) return 'divide';
  if (r < 0.75) return 'add';
  return 'subtract';
}

/**
 * Game model: config, state, and problem for each team.
 */
class Game {
  constructor(config = {}) {
    this.id = uuidv4();
    this.config = {
      selectedNumbers: config.selectedNumbers || [2, 3, 4, 5],
      problemType: config.problemType || 'multiply',
      playMode: config.playMode || 'computer',
    };
    this.state = {
      ropePosition: 50,
      team1Score: 0,
      team2Score: 0,
      gameOver: false,
      youWon: null,
      startedAt: new Date().toISOString(),
    };
    this.problemTeam1 = generateProblem(this.config);
    this.problemTeam2 = this.config.playMode === 'friend'
      ? generateProblem(this.config)
      : null;
  }

  getPublicState() {
    return {
      gameId: this.id,
      config: this.config,
      state: {
        ropePosition: this.state.ropePosition,
        team1Score: this.state.team1Score,
        team2Score: this.state.team2Score,
        gameOver: this.state.gameOver,
        youWon: this.state.youWon,
        startedAt: this.state.startedAt,
      },
      problemTeam1: this.problemTeam1,
      problemTeam2: this.problemTeam2,
    };
  }

  submitAnswer(team, answer) {
    if (this.state.gameOver) {
      return { correct: false, error: 'Game is over' };
    }
    const num = parseInt(answer, 10);
    if (Number.isNaN(num)) {
      return { correct: false };
    }
    const problem = team === 'team1' ? this.problemTeam1 : this.problemTeam2;
    if (!problem) {
      return { correct: false, error: 'No problem for this team' };
    }
    if (num !== problem.answer) {
      return { correct: false };
    }

    if (team === 'team1') {
      this.state.team1Score += 1;
      this.state.ropePosition = Math.max(MIN_POSITION, this.state.ropePosition - ROPE_STEP);
      this.problemTeam1 = generateProblem(this.config);
    } else {
      this.state.team2Score += 1;
      this.state.ropePosition = Math.min(MAX_POSITION, this.state.ropePosition + ROPE_STEP);
      this.problemTeam2 = this.config.playMode === 'friend'
        ? generateProblem(this.config)
        : null;
    }

    if (this.state.ropePosition <= MIN_POSITION) {
      this.state.gameOver = true;
      this.state.youWon = true;
    } else if (this.state.ropePosition >= MAX_POSITION) {
      this.state.gameOver = true;
      this.state.youWon = false;
    }

    return {
      correct: true,
      state: this.getPublicState().state,
      problemTeam1: this.problemTeam1,
      problemTeam2: this.problemTeam2,
      gameOver: this.state.gameOver,
      youWon: this.state.youWon,
    };
  }

  getNextProblem(team) {
    const problem = team === 'team1' ? this.problemTeam1 : this.problemTeam2;
    return problem;
  }
}

function createGame(config) {
  if (config.problemType && !problemTypes.includes(config.problemType)) {
    config.problemType = 'multiply';
  }
  if (config.playMode && !playModes.includes(config.playMode)) {
    config.playMode = 'computer';
  }
  const game = new Game(config);
  games.set(game.id, game);
  return game;
}

function getGame(gameId) {
  return games.get(gameId) || null;
}

module.exports = {
  Game,
  createGame,
  getGame,
  generateProblem,
  ROPE_STEP,
  MIN_POSITION,
  MAX_POSITION,
};
