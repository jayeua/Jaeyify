const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticateToken, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// MIME type mapping for high-quality audio streaming
const MIME_TYPES = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.aiff': 'audio/aiff',
  '.alac': 'audio/mp4',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || 'audio/mpeg';
}

// Configure multer for music uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'music') {
      cb(null, path.join(__dirname, '..', 'uploads', 'music'));
    } else if (file.fieldname === 'cover') {
      cb(null, path.join(__dirname, '..', 'uploads', 'covers'));
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB max — supports lossless FLAC/WAV
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'music') {
      const allowed = ['.mp3', '.wav', '.flac', '.m4a', '.ogg', '.aac', '.wma', '.opus', '.aiff'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Audio format ${ext} not supported. Use: ${allowed.join(', ')}`));
      }
    } else if (file.fieldname === 'cover') {
      const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowed.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error('Cover image must be JPG, PNG, or WebP'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Upload a song
// Streams the original file to disk: NO re-encoding, NO quality loss.
// Whatever you upload (320kbps MP3, lossless FLAC, 24-bit WAV) is exactly what gets streamed.
router.post('/upload', authenticateToken, upload.fields([
  { name: 'music', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.music) {
      return res.status(400).json({ error: 'Music file is required' });
    }

    const musicFile = req.files.music[0];
    const coverFile = req.files.cover ? req.files.cover[0] : null;

    const { title, artist, album, genre } = req.body;
    let duration = parseFloat(req.body.duration) || 0;

    // Try to read metadata from the file
    let metadata = {};
    try {
      const mm = require('music-metadata');
      metadata = await mm.parseFile(musicFile.path);
      if (!duration && metadata.format && metadata.format.duration) {
        duration = metadata.format.duration;
      }
    } catch (e) {
      // Metadata parsing optional
    }

    const songTitle = title || metadata?.common?.title || path.parse(musicFile.originalname).name;
    const songArtist = artist || metadata?.common?.artist || 'Unknown Artist';
    const songAlbum = album || metadata?.common?.album || 'Unknown Album';
    const songGenre = genre || (metadata?.common?.genre ? metadata.common.genre[0] : '');

    const filePath = `/uploads/music/${musicFile.filename}`;
    const coverPath = coverFile ? `/uploads/covers/${coverFile.filename}` : null;

    // If metadata has embedded cover art and no cover was uploaded, extract it
    if (!coverPath && metadata?.common?.picture && metadata.common.picture.length > 0) {
      const pic = metadata.common.picture[0];
      const ext = pic.format === 'image/png' ? '.png' : '.jpg';
      const coverFilename = `${uuidv4()}${ext}`;
      const coverFullPath = path.join(__dirname, '..', 'uploads', 'covers', coverFilename);
      fs.writeFileSync(coverFullPath, pic.data);
      var extractedCover = `/uploads/covers/${coverFilename}`;
    }

    const result = db.prepare(`
      INSERT INTO songs (title, artist, album, genre, duration, file_path, cover_path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(songTitle, songArtist, songAlbum, songGenre, duration, filePath, coverPath || extractedCover || null, req.user.id);

    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ message: 'Song uploaded successfully', song });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload song', message: err.message });
  }
});

// Batch upload multiple songs
router.post('/upload-batch', authenticateToken, upload.array('music', 20), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'At least one music file is required' });
    }

    const songs = [];
    const insertStmt = db.prepare(`
      INSERT INTO songs (title, artist, album, genre, duration, file_path, cover_path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of req.files) {
      let metadata = {};
      let duration = 0;
      let coverPath = null;

      try {
        const mm = require('music-metadata');
        metadata = await mm.parseFile(file.path);
        duration = metadata.format?.duration || 0;

        if (metadata?.common?.picture && metadata.common.picture.length > 0) {
          const pic = metadata.common.picture[0];
          const ext = pic.format === 'image/png' ? '.png' : '.jpg';
          const coverFilename = `${uuidv4()}${ext}`;
          fs.writeFileSync(path.join(__dirname, '..', 'uploads', 'covers', coverFilename), pic.data);
          coverPath = `/uploads/covers/${coverFilename}`;
        }
      } catch (e) { /* skip metadata */ }

      const title = metadata?.common?.title || path.parse(file.originalname).name;
      const artist = metadata?.common?.artist || 'Unknown Artist';
      const album = metadata?.common?.album || 'Unknown Album';
      const genre = metadata?.common?.genre ? metadata.common.genre[0] : '';

      const result = insertStmt.run(title, artist, album, genre, duration, `/uploads/music/${file.filename}`, coverPath, req.user.id);
      const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(result.lastInsertRowid);
      songs.push(song);
    }

    res.status(201).json({ message: `${songs.length} songs uploaded successfully`, songs });
  } catch (err) {
    console.error('Batch upload error:', err);
    res.status(500).json({ error: 'Failed to upload songs' });
  }
});

// Get all songs (with pagination & search)
router.get('/songs', optionalAuth, (req, res) => {
  try {
    const { search, artist, album, genre, sort, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT s.*, u.username as uploaded_by_name FROM songs s LEFT JOIN users u ON s.uploaded_by = u.id';
    let countQuery = 'SELECT COUNT(*) as total FROM songs s';
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (artist) {
      conditions.push('s.artist LIKE ?');
      params.push(`%${artist}%`);
    }
    if (album) {
      conditions.push('s.album LIKE ?');
      params.push(`%${album}%`);
    }
    if (genre) {
      conditions.push('s.genre LIKE ?');
      params.push(`%${genre}%`);
    }

    if (conditions.length > 0) {
      const where = ' WHERE ' + conditions.join(' AND ');
      query += where;
      countQuery += where;
    }

    // Sorting
    switch (sort) {
      case 'title': query += ' ORDER BY s.title ASC'; break;
      case 'artist': query += ' ORDER BY s.artist ASC'; break;
      case 'newest': query += ' ORDER BY s.created_at DESC'; break;
      case 'popular': query += ' ORDER BY s.play_count DESC'; break;
      default: query += ' ORDER BY s.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    const allParams = [...params];
    const countParams = [...params];
    allParams.push(parseInt(limit), parseInt(offset));

    const songs = db.prepare(query).all(...allParams);
    const total = db.prepare(countQuery).get(...countParams).total;

    // If user is authenticated, include like status
    if (req.user) {
      const likedIds = db.prepare('SELECT song_id FROM liked_songs WHERE user_id = ?').all(req.user.id).map(r => r.song_id);
      songs.forEach(song => {
        song.is_liked = likedIds.includes(song.id);
      });
    }

    res.json({
      songs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Get songs error:', err);
    res.status(500).json({ error: 'Failed to get songs' });
  }
});

// Get a single song
router.get('/songs/:id', optionalAuth, (req, res) => {
  try {
    const song = db.prepare('SELECT s.*, u.username as uploaded_by_name FROM songs s LEFT JOIN users u ON s.uploaded_by = u.id WHERE s.id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    if (req.user) {
      const liked = db.prepare('SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?').get(req.user.id, song.id);
      song.is_liked = !!liked;
    }

    res.json(song);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get song' });
  }
});

// Stream a song (increments play count)
router.get('/stream/:id', (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const filePath = path.join(__dirname, '..', song.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Increment play count (only on first request, not range continuations)
    if (!req.headers.range) {
      db.prepare('UPDATE songs SET play_count = play_count + 1 WHERE id = ?').run(song.id);
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Detect correct MIME type for high-quality playback
    // This ensures FLAC, WAV, AAC etc. are decoded natively without transcoding
    const contentType = getMimeType(song.file_path);

    // Common headers for quality streaming
    const commonHeaders = {
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=31536000, immutable', // Cache audio files aggressively
      'X-Content-Type-Options': 'nosniff',
    };

    if (range) {
      // Range request — supports seeking and chunked streaming
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;

      // Use 64KB highWaterMark for smooth high-bitrate streaming
      const file = fs.createReadStream(filePath, {
        start,
        end,
        highWaterMark: 64 * 1024,
      });

      res.writeHead(206, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': chunksize,
      });
      file.pipe(res);
    } else {
      // Full file request
      res.writeHead(200, {
        ...commonHeaders,
        'Content-Length': fileSize,
      });
      fs.createReadStream(filePath, { highWaterMark: 64 * 1024 }).pipe(res);
    }
  } catch (err) {
    console.error('Stream error:', err);
    res.status(500).json({ error: 'Failed to stream song' });
  }
});

// Get audio quality info for a song
router.get('/quality/:id', async (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const filePath = path.join(__dirname, '..', song.file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Audio file not found' });
    }

    const ext = path.extname(song.file_path).toLowerCase();
    const stat = fs.statSync(filePath);
    let quality = {
      format: ext.replace('.', '').toUpperCase(),
      file_size: stat.size,
      file_size_mb: (stat.size / (1024 * 1024)).toFixed(1),
      mime_type: getMimeType(song.file_path),
    };

    // Try to get detailed audio metadata
    try {
      const mm = require('music-metadata');
      const metadata = await mm.parseFile(filePath);
      const fmt = metadata.format;
      quality = {
        ...quality,
        codec: fmt.codec || quality.format,
        bitrate: fmt.bitrate || null,
        bitrate_kbps: fmt.bitrate ? Math.round(fmt.bitrate / 1000) : null,
        sample_rate: fmt.sampleRate || null,
        sample_rate_khz: fmt.sampleRate ? (fmt.sampleRate / 1000).toFixed(1) : null,
        bit_depth: fmt.bitsPerSample || null,
        channels: fmt.numberOfChannels || null,
        lossless: fmt.lossless || false,
        duration: fmt.duration || song.duration,
        quality_label: getQualityLabel(fmt),
      };
    } catch (e) {
      quality.quality_label = 'Standard';
    }

    res.json(quality);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get quality info' });
  }
});

function getQualityLabel(fmt) {
  if (fmt.lossless) return 'Lossless (Hi-Fi)';
  if (fmt.bitsPerSample >= 24) return 'Hi-Res Lossless';
  const bitrate = fmt.bitrate ? Math.round(fmt.bitrate / 1000) : 0;
  if (bitrate >= 320) return 'Very High (320kbps)';
  if (bitrate >= 256) return 'High (256kbps)';
  if (bitrate >= 192) return 'Normal (192kbps)';
  if (bitrate >= 128) return 'Standard (128kbps)';
  if (bitrate > 0) return `Low (${bitrate}kbps)`;
  return 'Standard';
}

// Like/unlike a song
router.post('/songs/:id/like', authenticateToken, (req, res) => {
  try {
    const songId = req.params.id;
    const userId = req.user.id;

    const song = db.prepare('SELECT id FROM songs WHERE id = ?').get(songId);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const existing = db.prepare('SELECT id FROM liked_songs WHERE user_id = ? AND song_id = ?').get(userId, songId);

    if (existing) {
      db.prepare('DELETE FROM liked_songs WHERE user_id = ? AND song_id = ?').run(userId, songId);
      res.json({ liked: false, message: 'Song unliked' });
    } else {
      db.prepare('INSERT INTO liked_songs (user_id, song_id) VALUES (?, ?)').run(userId, songId);
      res.json({ liked: true, message: 'Song liked' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to update like status' });
  }
});

// Get liked songs
router.get('/liked', authenticateToken, (req, res) => {
  try {
    const songs = db.prepare(`
      SELECT s.*, u.username as uploaded_by_name, 1 as is_liked
      FROM liked_songs ls
      JOIN songs s ON ls.song_id = s.id
      LEFT JOIN users u ON s.uploaded_by = u.id
      WHERE ls.user_id = ?
      ORDER BY ls.created_at DESC
    `).all(req.user.id);

    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get liked songs' });
  }
});

// Record recently played
router.post('/songs/:id/played', authenticateToken, (req, res) => {
  try {
    db.prepare('INSERT INTO recently_played (user_id, song_id) VALUES (?, ?)').run(req.user.id, req.params.id);

    // Keep only last 100 entries per user
    db.prepare(`
      DELETE FROM recently_played WHERE user_id = ? AND id NOT IN (
        SELECT id FROM recently_played WHERE user_id = ? ORDER BY played_at DESC LIMIT 100
      )
    `).run(req.user.id, req.user.id);

    res.json({ message: 'Recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record play' });
  }
});

// Get recently played
router.get('/recently-played', authenticateToken, (req, res) => {
  try {
    const songs = db.prepare(`
      SELECT DISTINCT s.*, u.username as uploaded_by_name, rp.played_at
      FROM recently_played rp
      JOIN songs s ON rp.song_id = s.id
      LEFT JOIN users u ON s.uploaded_by = u.id
      WHERE rp.user_id = ?
      ORDER BY rp.played_at DESC
      LIMIT 30
    `).all(req.user.id);

    // Add like status
    const likedIds = db.prepare('SELECT song_id FROM liked_songs WHERE user_id = ?').all(req.user.id).map(r => r.song_id);
    songs.forEach(song => {
      song.is_liked = likedIds.includes(song.id);
    });

    res.json({ songs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get recently played' });
  }
});

// Get all unique artists
router.get('/artists', (req, res) => {
  try {
    const artists = db.prepare(`
      SELECT artist, COUNT(*) as song_count, MIN(cover_path) as cover_path
      FROM songs
      GROUP BY artist
      ORDER BY artist ASC
    `).all();
    res.json({ artists });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get artists' });
  }
});

// Get all unique albums
router.get('/albums', (req, res) => {
  try {
    const albums = db.prepare(`
      SELECT album, artist, COUNT(*) as song_count, MIN(cover_path) as cover_path
      FROM songs
      GROUP BY album, artist
      ORDER BY album ASC
    `).all();
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get albums' });
  }
});

// Delete a song (owner only)
router.delete('/songs/:id', authenticateToken, (req, res) => {
  try {
    const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);
    if (!song) {
      return res.status(404).json({ error: 'Song not found' });
    }
    if (song.uploaded_by !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own songs' });
    }

    // Delete files
    const musicPath = path.join(__dirname, '..', song.file_path);
    if (fs.existsSync(musicPath)) fs.unlinkSync(musicPath);
    if (song.cover_path) {
      const coverPath = path.join(__dirname, '..', song.cover_path);
      if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    }

    db.prepare('DELETE FROM songs WHERE id = ?').run(req.params.id);
    res.json({ message: 'Song deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

module.exports = router;
