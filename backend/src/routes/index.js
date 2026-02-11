const express = require('express');
const gameRoutes = require('./gameRoutes');

const router = express.Router();

router.use('/api', gameRoutes);

module.exports = router;
