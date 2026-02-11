const mongoose = require('mongoose');
const config = require('./index');

let isConnected = false;

async function connectDB() {
  if (isConnected) return;
  const uri = config.mongodbUri;
  if (!uri) {
    console.warn('MONGODB_URI not set; skipping database connection.');
    return;
  }
  try {
    await mongoose.connect(uri);
    isConnected = true;
    console.log('MongoDB connected:', mongoose.connection.host);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
}

module.exports = { connectDB, mongoose };
