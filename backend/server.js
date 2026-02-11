const app = require('./src/app');
const config = require('./src/config');
const { connectDB } = require('./src/config/db');

const port = config.port;

async function start() {
  if (config.mongodbUri) {
    await connectDB();
  } else {
    console.warn('MONGODB_URI not set; running without database.');
  }

  app.listen(port, () => {
    console.log(`Backend running at http://localhost:${port}`);
    console.log(`  Health: http://localhost:${port}/health`);
    console.log(`  Auth:   POST http://localhost:${port}/api/auth/login`);
    console.log(`  Rooms:  POST http://localhost:${port}/api/rooms`);
    console.log(`  Join:   GET  http://localhost:${port}/api/rooms/code/:code`);
    console.log(`  Game:   POST http://localhost:${port}/api/startgame`);
  });
}

start().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
