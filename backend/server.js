const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload directories exist
const dirs = [
  path.join(__dirname, 'uploads', 'music'),
  path.join(__dirname, 'uploads', 'covers'),
  path.join(__dirname, 'uploads', 'avatars'),
  path.join(__dirname, 'data'),
];
dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/music', require('./routes/music'));
app.use('/api/playlists', require('./routes/playlists'));

// Health check
app.get('/api/health', (req, res) => {
  const { db } = require('./database');
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const songCount = db.prepare('SELECT COUNT(*) as count FROM songs').get().count;
  const uploadsExist = fs.existsSync(path.join(__dirname, 'uploads', 'music'));
  const musicFiles = uploadsExist ? fs.readdirSync(path.join(__dirname, 'uploads', 'music')).length : 0;
  res.json({
    status: 'ok',
    message: 'Jaeyify server is running!',
    stats: { users: userCount, songs: songCount, musicFiles },
    uptime: Math.floor(process.uptime()) + 's',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Initialize database and start server
initDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║       🎵 Jaeyify Server Running        ║
  ║                                          ║
  ║   Local:   http://localhost:${PORT}        ║
  ║   Network: http://0.0.0.0:${PORT}         ║
  ║                                          ║
  ║   Upload your music and enjoy!           ║
  ╚══════════════════════════════════════════╝
  `);
});
