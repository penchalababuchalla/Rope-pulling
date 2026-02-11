const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use(routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'my-game-backend' });
});

module.exports = app;
