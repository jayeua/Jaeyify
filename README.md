# 🎵 Jaeyify — Self-Hosted Music Streaming App

Your own personal Spotify — no subscriptions, no ads, full control. Upload your music, create playlists, and stream on iPhone, Android, and Desktop.

---

## 📱 Features

- **Cross-Platform** — iOS, Android, Web, and Desktop from one codebase
- **Upload & Stream** — Upload MP3, WAV, FLAC, M4A, OGG, AAC, OPUS, AIFF files (up to 200MB each)
- **Spotify-Quality Audio** — Zero re-encoding. Your 320kbps MP3 or lossless FLAC streams bit-for-bit
- **Audio Quality Indicator** — See bitrate, sample rate, and lossless status in the player
- **Auto Metadata** — Automatically extracts title, artist, album, and cover art from files
- **Playlists** — Create and manage playlists
- **Like Songs** — Save your favorites
- **Search** — Search by song, artist, or album
- **Share with Friends** — Friends can create accounts and use the app too
- **Beautiful Dark UI** — Sleek purple-accented dark theme
- **Background Playback** — Keep listening while using other apps (iOS/Android)
- **Docker Support** — One command to deploy with `docker compose up`
- **No Subscriptions** — Free forever, self-hosted

---

## 🎵 Audio Quality

Jaeyify streams your files **exactly as uploaded** — no transcoding, no compression, no quality loss.

| What you upload | What you hear | Comparable to |
|---|---|---|
| MP3 320kbps | 320kbps | Spotify "Very High" (Premium) |
| MP3 256kbps | 256kbps | Spotify "High" |
| FLAC (lossless) | Lossless | Spotify HiFi / Tidal HiFi |
| WAV 24-bit/96kHz | Hi-Res Lossless | Apple Music Lossless |
| AAC 256kbps | 256kbps | Apple Music default |

**Tip**: For the best quality, upload 320kbps MP3 or FLAC files. The player shows a quality badge so you know exactly what you're streaming.

---

## 🏗️ Architecture

```
jaeyify/
├── backend/           ← Node.js + Express + SQLite server
├── app/               ← React Native + Expo (iOS, Android, Web)
├── desktop/           ← Electron wrapper for desktop
├── Dockerfile         ← Docker image for the backend
├── docker-compose.yml ← One-command deployment
└── .dockerignore
```

---

## 🐳 Quick Start with Docker (Recommended)

The easiest way to get running — just need [Docker](https://docs.docker.com/get-docker/) installed.

### One command:

```bash
docker compose up -d --build
```

That's it! The server is now running at `http://localhost:3000`.

### With a custom secret (recommended for security):

```bash
JWT_SECRET=your-secret-here docker compose up -d --build
```

### Useful Docker commands:

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f jaeyify

# Stop
docker compose down

# Stop and delete all data (music, accounts, etc.)
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

### Docker data persistence

Your data is stored in Docker volumes and persists across restarts:
- `jaeyify-data` — Database (accounts, playlists, metadata)
- `jaeyify-music` — Uploaded music files
- `jaeyify-covers` — Album cover art
- `jaeyify-avatars` — User avatars

---

## 🚀 Quick Start without Docker

### Prerequisites
- **Node.js** v18+ — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Expo CLI** — installed automatically

### Step 1: Start the Backend Server

```bash
cd backend
npm install
npm start
```

The server will start at `http://localhost:3000`.

### Step 2: Start the Mobile/Web App

```bash
cd app
npm install
npx expo start
```

Then:
- Press **`w`** to open in web browser (desktop)
- Press **`i`** for iOS simulator (Mac only)
- Press **`a`** for Android emulator
- Scan the QR code with **Expo Go** app on your phone

### Step 3 (Optional): Desktop App via Electron

```bash
cd desktop
npm install
```

First make sure the Expo web server is running (`cd app && npx expo start --web`), then:

```bash
npm start
```

---

## 📱 Running on Your Phone

### Using Expo Go (Easiest)
1. Install **Expo Go** from the App Store (iPhone) or Play Store (Android)
2. Start the backend server on your computer
3. Start the Expo app with `npx expo start`
4. Scan the QR code with Expo Go
5. **Important**: Update the server URL in `app/src/config.js` to your computer's local IP

### Finding Your Computer's IP
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Update `app/src/config.js`:
```js
const DEV_SERVER = 'http://192.168.1.XXX:3000';  // Your PC's IP
```

### Building Standalone Apps

For a real installable app (without Expo Go):

```bash
cd app

# Build for iOS (requires Mac + Apple Developer account)
npx eas build --platform ios

# Build for Android (generates APK)
npx eas build --platform android --profile preview
```

---

## 🎧 Usage

### 1. Create an Account
Open the app and register with a username, email, and password.

### 2. Upload Music

There are **3 ways** to upload your music:

#### Way 1: From the App (easiest for phone)
1. Open the app and go to the **Upload** tab (cloud icon at the bottom)
2. Choose **Single** mode for one song, or **Batch** for many
3. Tap the upload area and select your music file(s) from your phone/computer
4. For single uploads, you can optionally edit the title, artist, album, and add cover art
5. Tap **Upload Song** — metadata is auto-extracted from the file!

#### Way 2: Using curl / command line (bulk upload from PC)
```bash
# Upload a single song
curl -X POST http://localhost:3000/api/music/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "music=@/path/to/song.mp3"

# Upload with metadata
curl -X POST http://localhost:3000/api/music/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "music=@/path/to/song.flac" \
  -F "title=My Song" \
  -F "artist=Artist Name" \
  -F "album=Album Name" \
  -F "cover=@/path/to/cover.jpg"

# Upload multiple songs at once (batch)
curl -X POST http://localhost:3000/api/music/upload-batch \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "music=@song1.mp3" \
  -F "music=@song2.flac" \
  -F "music=@song3.wav"
```

To get your token, log in first:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "your_username", "password": "your_password"}'
```

#### Way 3: Upload script (bulk upload a whole folder)
```bash
# Upload all MP3/FLAC files in a folder (Linux/Mac/Git Bash)
TOKEN="your_token_here"
for f in /path/to/music/*.mp3 /path/to/music/*.flac; do
  echo "Uploading: $f"
  curl -X POST http://localhost:3000/api/music/upload \
    -H "Authorization: Bearer $TOKEN" \
    -F "music=@$f"
done
```

```powershell
# PowerShell version (Windows)
$token = "your_token_here"
Get-ChildItem "C:\Music" -Include *.mp3,*.flac -Recurse | ForEach-Object {
  Write-Host "Uploading: $($_.Name)"
  curl -X POST http://localhost:3000/api/music/upload `
    -H "Authorization: Bearer $token" `
    -F "music=@$($_.FullName)"
}
```

### 3. Listen
- Browse your library on the **Home** screen
- Use **Search** to find songs by title, artist, or album
- Tap any song to play it
- Use the mini player at the bottom or tap it for full-screen controls
- The player shows a **quality badge** (e.g., "Very High 320kbps", "Lossless Hi-Fi")

### 4. Create Playlists
- Go to **Library** → tap the **+** button
- Name your playlist
- Add songs from search results

### 5. Invite Friends
Share your server URL and have friends create accounts. Everyone can:
- Upload their own music
- Create playlists
- Stream all shared music

---

## 🔧 Configuration

### Backend (`backend/server.js`)
- **Port**: Default `3000`. Change with `PORT=8080 npm start`
- **JWT Secret**: Set `JWT_SECRET` environment variable for production

### App (`app/src/config.js`)
- **Server URL**: Update `DEV_SERVER` to match your backend

---

## 🌐 Hosting for Remote Access (Use When PC is Off)

If you want to use the app at school/uni or when your PC is off, deploy the backend to the cloud for **free**:

### Option A: Render.com (Recommended — Free, Easiest)

1. Push this project to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
   Then create a repo on [github.com](https://github.com) and push to it.

2. Go to [render.com](https://render.com) and sign up (free)

3. Click **New → Web Service**

4. Connect your GitHub repo

5. Settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && node server.js`
   - **Plan**: Free

6. Click **Deploy** — it takes ~2 minutes

7. You'll get a URL like `https://jaeyify-xxxx.onrender.com`

8. Update `app/src/config.js`:
   ```js
   const SERVER_URL = 'https://jaeyify-xxxx.onrender.com';
   ```

9. Now it works **anywhere**, on any device, even when your PC is off!

> **Note**: Render free tier sleeps after 15min of inactivity. First request after sleep takes ~30 seconds to wake up, then it's fast. For always-on, their paid plan is $7/month.

### Option B: Railway.app (Free tier)
1. Go to [railway.app](https://railway.app), connect GitHub
2. Deploy → it auto-detects the Procfile
3. Get your URL and update `config.js`

### Option C: Use ngrok (for quick testing)
```bash
ngrok http 3000
```
This gives you a temporary public URL. Good for testing, not permanent.

### Option D: Raspberry Pi at home
Run the backend on a Raspberry Pi (~$35) that stays on 24/7 with port forwarding.

---

## 📁 Supported Audio Formats

| Format | Extension | Type | Max Upload |
|--------|-----------|------|------------|
| MP3    | .mp3      | Lossy | 200MB |
| FLAC   | .flac     | Lossless | 200MB |
| WAV    | .wav      | Lossless | 200MB |
| AAC    | .aac      | Lossy | 200MB |
| M4A    | .m4a      | Lossy/Lossless | 200MB |
| OGG    | .ogg      | Lossy | 200MB |
| WMA    | .wma      | Lossy | 200MB |
| OPUS   | .opus     | Lossy | 200MB |
| AIFF   | .aiff     | Lossless | 200MB |

---

## 🛡️ Important Notes

- This is for **personal use** with your own legally obtained music files
- The app is designed for private/friend group use, not public distribution
- Keep your music library legal — use music you own or have rights to
- The backend stores music files locally on whatever machine runs it

---

## 🐛 Troubleshooting

### "Cannot connect to server"
- Make sure the backend is running (`cd backend && npm start`)
- Check the URL in `app/src/config.js` matches your server
- If on phone, make sure you're on the same WiFi network

### "Audio won't play"
- Ensure the music file was uploaded successfully
- Check the backend console for errors
- Try a different audio format (MP3 is most compatible)

### Expo won't start
```bash
cd app
rm -rf node_modules
npm install
npx expo start --clear
```

---

## License

MIT — Free to use, modify, and share.
