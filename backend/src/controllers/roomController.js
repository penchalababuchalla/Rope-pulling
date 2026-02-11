const Room = require('../models/Room');
const User = require('../models/User');

/**
 * POST /api/rooms
 * Body: { username: string, userId?: string, gameConfig?: { selectedNumbers?, problemType? } }
 * Returns: { roomCode, roomId, room }
 */
async function createRoom(req, res) {
  try {
    const username = (req.body?.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }

    const roomCode = await Room.createUniqueRoomCode();
    const gameConfig = {
      selectedNumbers: Array.isArray(req.body?.gameConfig?.selectedNumbers)
        ? req.body.gameConfig.selectedNumbers
        : [2, 3, 4, 5],
      problemType: req.body?.gameConfig?.problemType || 'multiply',
    };

    const room = await Room.create({
      roomCode,
      host: user._id,
      hostUsername: user.username,
      status: 'waiting',
      players: [{ user: user._id, username: user.username, team: 'team1' }],
      gameConfig,
    });

    const roomObj = room.toObject();
    roomObj.id = roomObj._id.toString();
    delete roomObj.__v;

    res.status(201).json({
      roomCode: room.roomCode,
      roomId: room._id.toString(),
      room: roomObj,
    });
  } catch (err) {
    console.error('createRoom error:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
}

/**
 * GET /api/rooms/code/:code
 * Returns: { room } (public info: roomCode, status, hostUsername, players, gameConfig)
 */
async function getRoomByCode(req, res) {
  try {
    const code = (req.params.code || '').toUpperCase().trim();
    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    const room = await Room.findOne({ roomCode: code }).lean();

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const sanitized = {
      id: room._id.toString(),
      roomCode: room.roomCode,
      status: room.status,
      hostUsername: room.hostUsername,
      players: room.players?.map((p) => ({
        username: p.username,
        team: p.team,
      })) || [],
      gameConfig: room.gameConfig || {},
      gameState: room.gameState || {},
      createdAt: room.createdAt,
    };

    res.status(200).json({ room: sanitized });
  } catch (err) {
    console.error('getRoomByCode error:', err);
    res.status(500).json({ error: 'Failed to get room' });
  }
}

/**
 * POST /api/rooms/code/:code/join
 * Body: { username: string }
 * Returns: { room, playerTeam: 'team2' }
 */
async function joinRoom(req, res) {
  try {
    const code = (req.params.code || '').toUpperCase().trim();
    const username = (req.body?.username || '').trim();
    if (!code) return res.status(400).json({ error: 'Room code is required' });
    if (!username) return res.status(400).json({ error: 'Username is required' });
    if (username.length > 32) return res.status(400).json({ error: 'Username too long' });

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }

    const room = await Room.findOne({ roomCode: code });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    if (room.status !== 'waiting') {
      return res.status(400).json({ error: 'Room is not accepting players' });
    }

    const alreadyInRoom = room.players.some(
      (p) => p.user.toString() === user._id.toString() || p.username === username
    );
    if (alreadyInRoom) {
      const playerTeam = room.players.find((p) => p.username === username)?.team || 'team2';
      const roomObj = room.toObject();
      roomObj.id = roomObj._id.toString();
      delete roomObj.__v;
      return res.status(200).json({ room: roomObj, playerTeam });
    }

    const team2Count = room.players.filter((p) => p.team === 'team2').length;
    if (team2Count >= 1) {
      return res.status(400).json({ error: 'Room is full' });
    }

    room.players.push({ user: user._id, username: user.username, team: 'team2' });
    await room.save();

    const roomObj = room.toObject();
    roomObj.id = roomObj._id.toString();
    delete roomObj.__v;

    res.status(200).json({ room: roomObj, playerTeam: 'team2' });
  } catch (err) {
    console.error('joinRoom error:', err);
    res.status(500).json({ error: 'Failed to join room' });
  }
}

module.exports = {
  createRoom,
  getRoomByCode,
  joinRoom,
};
