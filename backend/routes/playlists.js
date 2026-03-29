const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Cover upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads', 'covers')),
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Create a playlist
router.post('/', authenticateToken, upload.single('cover'), (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const coverPath = req.file ? `/uploads/covers/${req.file.filename}` : null;

    const result = db.prepare(`
      INSERT INTO playlists (name, description, cover_path, created_by)
      VALUES (?, ?, ?, ?)
    `).run(name, description || '', coverPath, req.user.id);

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ message: 'Playlist created', playlist });
  } catch (err) {
    console.error('Create playlist error:', err);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Get all playlists
router.get('/', optionalAuth, (req, res) => {
  try {
    const playlists = db.prepare(`
      SELECT p.*, u.username as created_by_name,
        (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
      FROM playlists p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.is_public = 1 ${req.user ? 'OR p.created_by = ' + req.user.id : ''}
      ORDER BY p.created_at DESC
    `).all();

    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// Get my playlists
router.get('/mine', authenticateToken, (req, res) => {
  try {
    const playlists = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
      FROM playlists p
      WHERE p.created_by = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);

    res.json({ playlists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlists' });
  }
});

// Get a single playlist with songs
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const playlist = db.prepare(`
      SELECT p.*, u.username as created_by_name
      FROM playlists p
      LEFT JOIN users u ON p.created_by = u.id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const songs = db.prepare(`
      SELECT s.*, ps.position, ps.added_at, u.username as uploaded_by_name
      FROM playlist_songs ps
      JOIN songs s ON ps.song_id = s.id
      LEFT JOIN users u ON s.uploaded_by = u.id
      WHERE ps.playlist_id = ?
      ORDER BY ps.position ASC
    `).all(req.params.id);

    // Add like status if authenticated
    if (req.user) {
      const likedIds = db.prepare('SELECT song_id FROM liked_songs WHERE user_id = ?').all(req.user.id).map(r => r.song_id);
      songs.forEach(song => {
        song.is_liked = likedIds.includes(song.id);
      });
    }

    res.json({ ...playlist, songs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get playlist' });
  }
});

// Add song to playlist
router.post('/:id/songs', authenticateToken, (req, res) => {
  try {
    const { song_id } = req.body;
    const playlistId = req.params.id;

    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(song_id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    // Get next position
    const maxPos = db.prepare('SELECT MAX(position) as max FROM playlist_songs WHERE playlist_id = ?').get(playlistId);
    const position = (maxPos.max || 0) + 1;

    db.prepare('INSERT OR IGNORE INTO playlist_songs (playlist_id, song_id, position) VALUES (?, ?, ?)').run(playlistId, song_id, position);

    res.json({ message: 'Song added to playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// Remove song from playlist
router.delete('/:id/songs/:songId', authenticateToken, (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    db.prepare('DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?').run(req.params.id, req.params.songId);
    res.json({ message: 'Song removed from playlist' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove song' });
  }
});

// Update playlist
router.put('/:id', authenticateToken, upload.single('cover'), (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only modify your own playlists' });
    }

    const { name, description, is_public } = req.body;
    const coverPath = req.file ? `/uploads/covers/${req.file.filename}` : playlist.cover_path;

    db.prepare(`
      UPDATE playlists SET name = ?, description = ?, cover_path = ?, is_public = ?
      WHERE id = ?
    `).run(
      name || playlist.name,
      description !== undefined ? description : playlist.description,
      coverPath,
      is_public !== undefined ? parseInt(is_public) : playlist.is_public,
      req.params.id
    );

    const updated = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
    res.json({ message: 'Playlist updated', playlist: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete playlist
router.delete('/:id', authenticateToken, (req, res) => {
  try {
    const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    if (playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own playlists' });
    }

    db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
    res.json({ message: 'Playlist deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

module.exports = router;
