// ==============================================
// Jaeyify API Configuration
// ==============================================
//
// Pick ONE of these and set it as SERVER_URL:
//
// 1. LOCAL (PC must be on, same WiFi):
//    const SERVER_URL = 'http://localhost:3000';
//
// 2. LOCAL from phone (same WiFi — run 'ipconfig' to find your PC's IP):
//    const SERVER_URL = 'http://192.168.1.XXX:3000';
//
// 3. CLOUD (works anywhere, even when PC is off):
//    Deploy to Render.com (free), then use your Render URL:
//    const SERVER_URL = 'https://jaeyify-XXXX.onrender.com';
//

// ⬇️ CHANGE THIS to your cloud URL after deploying ⬇️
const SERVER_URL = 'https://jaeyify.onrender.com';

export const API_URL = SERVER_URL;
export const STREAM_URL = `${SERVER_URL}/api/music/stream`;

export default {
  API_URL,
  STREAM_URL,
};
