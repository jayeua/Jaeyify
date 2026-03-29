import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, AudioModule } from 'expo-audio';
import api from '../services/api';

const PlayerContext = createContext(null);

// Inner component that uses the audio player hook
function PlayerProviderInner({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // off, one, all
  const [currentUrl, setCurrentUrl] = useState(null);

  const player = useAudioPlayer(currentUrl ? { uri: currentUrl } : null);
  const status = useAudioPlayerStatus(player);

  const isPlaying = status?.playing ?? false;
  const position = Math.floor((status?.currentTime ?? 0) * 1000); // convert to ms
  const duration = Math.floor((status?.duration ?? 0) * 1000);    // convert to ms
  const didFinish = status?.didJustFinish ?? false;

  // Configure audio mode on mount
  useEffect(() => {
    AudioModule.setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      shouldRouteThroughEarpiece: false,
    });
  }, []);

  // Handle song end
  useEffect(() => {
    if (didFinish) {
      handleSongEnd();
    }
  }, [didFinish]);

  // Auto-play when URL is set
  useEffect(() => {
    if (currentUrl && player) {
      player.play();
    }
  }, [currentUrl, player]);

  const handleSongEnd = useCallback(async () => {
    if (repeatMode === 'one') {
      player.seekTo(0);
      player.play();
    } else if (queueIndex < queue.length - 1 || repeatMode === 'all') {
      await playNext();
    }
  }, [repeatMode, queue, queueIndex, shuffle, player]);

  const loadAndPlay = useCallback(async (song) => {
    try {
      setIsLoading(true);
      setCurrentSong(song);
      const streamUrl = api.getStreamURL(song.id);
      setCurrentUrl(streamUrl);

      // Record play
      try {
        await api.recordPlay(song.id);
      } catch (e) {
        // Non-critical
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const play = useCallback(async (songs, index = 0) => {
    if (!Array.isArray(songs)) {
      songs = [songs];
      index = 0;
    }
    setQueue(songs);
    setQueueIndex(index);
    await loadAndPlay(songs[index]);
  }, [loadAndPlay]);

  const pause = useCallback(() => {
    if (player) player.pause();
  }, [player]);

  const resume = useCallback(() => {
    if (player) player.play();
  }, [player]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  const seek = useCallback((positionMs) => {
    if (player) {
      player.seekTo(positionMs / 1000); // expo-audio uses seconds
    }
  }, [player]);

  const playNext = useCallback(async () => {
    if (queue.length === 0) return;

    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = queueIndex + 1;
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return;
        }
      }
    }

    setQueueIndex(nextIndex);
    await loadAndPlay(queue[nextIndex]);
  }, [queue, queueIndex, shuffle, repeatMode, loadAndPlay]);

  const playPrevious = useCallback(async () => {
    if (queue.length === 0) return;

    if (position > 3000) {
      seek(0);
      return;
    }

    let prevIndex = queueIndex - 1;
    if (prevIndex < 0) {
      if (repeatMode === 'all') {
        prevIndex = queue.length - 1;
      } else {
        prevIndex = 0;
      }
    }

    setQueueIndex(prevIndex);
    await loadAndPlay(queue[prevIndex]);
  }, [queue, queueIndex, position, repeatMode, loadAndPlay, seek]);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const addToQueue = useCallback((song) => {
    setQueue(prev => [...prev, song]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(0);
  }, []);

  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <PlayerContext.Provider value={{
      currentSong,
      queue,
      queueIndex,
      isPlaying,
      isLoading,
      position,
      duration,
      shuffle,
      repeatMode,
      play,
      pause,
      resume,
      togglePlayPause,
      seek,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
      addToQueue,
      clearQueue,
      formatTime,
      progress: duration > 0 ? position / duration : 0,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function PlayerProvider({ children }) {
  return <PlayerProviderInner>{children}</PlayerProviderInner>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}

export default PlayerContext;
