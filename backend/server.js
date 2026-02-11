const app = require('./src/app');
const config = require('./src/config');

const port = config.port;

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
  console.log(`  Health: http://localhost:${port}/health`);
  console.log(`  Start game: POST http://localhost:${port}/api/startgame`);
});
