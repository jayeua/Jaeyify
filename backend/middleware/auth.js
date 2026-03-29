const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'jaeyify-secret-key-change-in-production';

// After Render free tier restarts, the database is wiped but JWT tokens
// are still valid (secret is in env vars). This function ensures the user
// record exists in the DB, re-creating it from JWT data if needed.
function ensureUserExists(jwtUser) {
  try {
    const { db } = require('../database');
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(jwtUser.id);
    if (!existing) {
      console.log(`User ${jwtUser.id} (${jwtUser.username}) not in DB — re-creating from token...`);
      // Create a placeholder record with the same ID so foreign keys work.
      // Use a random hash since we can't recover the real password from the token.
      const placeholderHash = bcrypt.hashSync('placeholder-will-need-reset', 10);
      db.prepare(
        'INSERT OR IGNORE INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)'
      ).run(jwtUser.id, jwtUser.username || 'user', jwtUser.email || `user${jwtUser.id}@jaeyify.local`, placeholderHash);
      console.log(`Re-created user ${jwtUser.id} successfully`);
    }
  } catch (err) {
    console.error('ensureUserExists error:', err.message);
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    // Make sure the user record exists in the DB (handles server restarts)
    ensureUserExists(user);
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = jwt.verify(token, JWT_SECRET);
      req.user = user;
      ensureUserExists(user);
    } catch (err) {
      // Token invalid, continue without user
    }
  }
  next();
}

module.exports = { authenticateToken, optionalAuth, JWT_SECRET };
