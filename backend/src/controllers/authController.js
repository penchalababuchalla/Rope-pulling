const User = require('../models/User');

/**
 * POST /api/auth/login
 * Body: { username: string }
 * Returns: { user: { id, username } }
 */
async function login(req, res) {
  try {
    const username = (req.body?.username || '').trim();
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    if (username.length > 32) {
      return res.status(400).json({ error: 'Username must be at most 32 characters' });
    }

    let user = await User.findOne({ username });
    if (!user) {
      user = await User.create({ username });
    }

    res.status(200).json({
      user: {
        id: user._id.toString(),
        username: user.username,
      },
    });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { login };
