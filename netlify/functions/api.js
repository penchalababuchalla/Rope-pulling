const path = require('path');

// Load env from backend/.env when present (e.g. local); Netlify sets MONGODB_URI in UI
require('dotenv').config({ path: path.resolve(__dirname, '../../backend/.env') });

const serverless = require('serverless-http');
const app = require('../../backend/src/app');

const { connectDB } = require('../../backend/src/config/db');

let handler;
let dbReady = false;

async function ensureDb() {
  if (dbReady) return;
  await connectDB();
  dbReady = true;
}

/**
 * Netlify redirects /api/* to /.netlify/functions/api/:splat
 * so the request path becomes /.netlify/functions/api/...
 * Strip the prefix so Express sees /api/...
 */
module.exports.handler = async (event, context) => {
  await ensureDb();
  if (!handler) {
    handler = serverless(app, {
      basePath: '/.netlify/functions',
    });
  }
  return handler(event, context);
};
