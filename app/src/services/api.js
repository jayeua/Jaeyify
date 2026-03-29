import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

class ApiService {
  constructor() {
    this.baseURL = API_URL;
    this.token = null;
  }

  async init() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      AsyncStorage.setItem('auth_token', token);
    } else {
      AsyncStorage.removeItem('auth_token');
    }
  }

  getHeaders(isFormData = false) {
    const headers = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // Wake up the Render free-tier server (it sleeps after 15 min of inactivity)
  async ensureServerAwake() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000); // 60s for cold start
      await fetch(`${this.baseURL}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
    } catch (e) {
      // If health check fails, the actual request will also fail with a better error
      console.log('Server wake-up ping failed:', e.message);
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: {
        ...this.getHeaders(options.isFormData),
        ...options.headers,
      },
    };

    if (options.body) {
      config.body = options.body;
    }

    if (options.isFormData) {
      delete config.headers['Content-Type'];
    }

    try {
      const response = await fetch(url, config);

      // Try to parse as JSON, handle non-JSON responses gracefully
      let data;
      const text = await response.text();

      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        // Response wasn't JSON - might be SSE, error page, or Render timeout
        if (!response.ok) {
          // Check for common Render error pages
          if (response.status === 502 || response.status === 503) {
            throw new Error('Server is starting up. Please wait a moment and try again.');
          }
          throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
        }
        // If it looks like SSE data, try to extract the last JSON event
        if (text.includes('data: ')) {
          const events = text.split('\n\n').filter(e => e.startsWith('data: '));
          const lastEvent = events[events.length - 1];
          if (lastEvent) {
            try {
              data = JSON.parse(lastEvent.replace('data: ', ''));
            } catch (e) {
              throw new Error('Unexpected response from server');
            }
          }
        } else {
          throw new Error('Unexpected response from server');
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `Request failed (${response.status})`);
      }

      return data;
    } catch (err) {
      if (err.message === 'Network request failed') {
        throw new Error('Cannot connect to server. Check your connection and server URL.');
      }
      throw err;
    }
  }

  // ==================== AUTH ====================
  async register(username, email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(login, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getProfile() {
    return this.request('/api/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // ==================== MUSIC ====================
  async getSongs(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/music/songs?${query}`);
  }

  async getSong(id) {
    return this.request(`/api/music/songs/${id}`);
  }

  getStreamURL(songId) {
    return `${this.baseURL}/api/music/stream/${songId}`;
  }

  getCoverURL(coverPath) {
    if (!coverPath) return null;
    return `${this.baseURL}${coverPath}`;
  }

  async uploadSong(formData) {
    // Wake up server first (Render free tier goes to sleep)
    await this.ensureServerAwake();
    return this.request('/api/music/upload', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async uploadBatch(formData) {
    await this.ensureServerAwake();
    return this.request('/api/music/upload-batch', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async toggleLike(songId) {
    return this.request(`/api/music/songs/${songId}/like`, { method: 'POST' });
  }

  async getLikedSongs() {
    return this.request('/api/music/liked');
  }

  async recordPlay(songId) {
    return this.request(`/api/music/songs/${songId}/played`, { method: 'POST' });
  }

  async getRecentlyPlayed() {
    return this.request('/api/music/recently-played');
  }

  async getArtists() {
    return this.request('/api/music/artists');
  }

  async getAlbums() {
    return this.request('/api/music/albums');
  }

  async deleteSong(id) {
    return this.request(`/api/music/songs/${id}`, { method: 'DELETE' });
  }

  async getAudioQuality(songId) {
    return this.request(`/api/music/quality/${songId}`);
  }

  // Import song from YouTube / SoundCloud URL
  async importFromUrl(url) {
    await this.ensureServerAwake();
    return this.request('/api/music/import-url', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  }

  // ==================== PLAYLISTS ====================
  async getPlaylists() {
    return this.request('/api/playlists');
  }

  async getMyPlaylists() {
    return this.request('/api/playlists/mine');
  }

  async getPlaylist(id) {
    return this.request(`/api/playlists/${id}`);
  }

  async createPlaylist(formData) {
    return this.request('/api/playlists', {
      method: 'POST',
      body: formData,
      isFormData: true,
    });
  }

  async updatePlaylist(id, formData) {
    return this.request(`/api/playlists/${id}`, {
      method: 'PUT',
      body: formData,
      isFormData: true,
    });
  }

  async addToPlaylist(playlistId, songId) {
    return this.request(`/api/playlists/${playlistId}/songs`, {
      method: 'POST',
      body: JSON.stringify({ song_id: songId }),
    });
  }

  async removeFromPlaylist(playlistId, songId) {
    return this.request(`/api/playlists/${playlistId}/songs/${songId}`, {
      method: 'DELETE',
    });
  }

  async deletePlaylist(id) {
    return this.request(`/api/playlists/${id}`, { method: 'DELETE' });
  }
}

const api = new ApiService();
export default api;
