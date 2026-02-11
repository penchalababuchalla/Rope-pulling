const mongoose = require('mongoose');

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const playerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    team: { type: String, enum: ['team1', 'team2'], required: true },
  },
  { _id: false }
);

const gameConfigSchema = new mongoose.Schema(
  {
    selectedNumbers: { type: [Number], default: [2, 3, 4, 5] },
    problemType: {
      type: String,
      enum: ['multiply', 'divide', 'add', 'subtract', 'both', 'all'],
      default: 'multiply',
    },
  },
  { _id: false }
);

const gameStateSchema = new mongoose.Schema(
  {
    ropePosition: { type: Number, default: 50 },
    team1Score: { type: Number, default: 0 },
    team2Score: { type: Number, default: 0 },
    gameOver: { type: Boolean, default: false },
    winner: { type: String, enum: ['team1', 'team2', null], default: null },
    startedAt: { type: Date, default: null },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostUsername: { type: String, required: true },
    status: {
      type: String,
      enum: ['waiting', 'in_progress', 'finished'],
      default: 'waiting',
    },
    players: [playerSchema],
    gameConfig: { type: gameConfigSchema, default: () => ({}) },
    gameState: { type: gameStateSchema, default: () => ({}) },
  },
  { timestamps: true }
);

roomSchema.index({ status: 1, createdAt: -1 });

function generateRoomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length));
  }
  return code;
}

roomSchema.statics.createUniqueRoomCode = async function () {
  let code;
  let exists = true;
  let attempts = 0;
  const maxAttempts = 20;
  while (exists && attempts < maxAttempts) {
    code = generateRoomCode();
    const found = await this.findOne({ roomCode: code });
    exists = !!found;
    attempts++;
  }
  if (exists) throw new Error('Could not generate unique room code');
  return code;
};

module.exports = mongoose.model('Room', roomSchema);
module.exports.ROOM_CODE_LENGTH = ROOM_CODE_LENGTH;
