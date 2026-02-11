const express = require('express');
const gameRoutes = require('./gameRoutes');
const authRoutes = require('./authRoutes');
const roomRoutes = require('./roomRoutes');

const router = express.Router();

router.use('/api', authRoutes);
router.use('/api', roomRoutes);
router.use('/api', gameRoutes);

module.exports = router;
