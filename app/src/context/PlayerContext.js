import React, { createContext, useState, useContext, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import api from '../services/api';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);      // milliseconds
  const [duration, setDuration] = useState(0);        // milliseconds
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // off, one, all

  const soundRef = useRef(null);
  const positionTimerRef = useRef(null);

  // Configure audio mode on mount
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current);
      }
    };
  }, []);

  const onPlaybackStatusUpdate = useCallback((status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        handleSongEnd();
      }
    }
  }, [repeatMode, shuffle, queue, queueIndex]);

  const handleSongEnd = useCallback(async () => {
    if (repeatMode === 'one') {
      // Replay current song
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } else if (queueIndex < queue.length - 1 || repeatMode === 'all') {
      // Play next song
      await playNext();
    } else {
      // End of queue, stop
      setIsPlaying(false);
      setPosition(0);
    }
  }, [repeatMode, queue, queueIndex, shuffle]);

  const loadAndPlay = useCallback(async (song) => {
    try {
      setIsLoading(true);

      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      setCurrentSong(song);
      setPosition(0);
      setDuration(0);

      const streamUrl = api.getStreamURL(song.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: streamUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      soundRef.current = sound;
      setIsPlaying(true);

      // Record play
      try {
        await api.recordPlay(song.id);
      } catch (e) {
        // Non-critical, ignore
      }
    } catch (err) {
      console.error('Failed to load audio:', err);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [onPlaybackStatusUpdate]);

  // Play a single song or a list of songs starting at an index
  const play = useCallback(async (songs, index = 0) => {
    if (!Array.isArray(songs)) {
      songs = [songs];
      index = 0;
    }

    setQueue(songs);
    setQueueIndex(index);
    await loadAndPlay(songs[index]);
  }, [loadAndPlay]);

  const pause = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    }
  }, []);

  const resume = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  }, [isPlaying, pause, resume]);

  const seek = useCallback(async (positionMs) => {
    if (soundRef.current) {
      await soundRef.current.setPositionAsync(positionMs);
      setPosition(positionMs);
    }
  }, []);

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
          return; // End of queue
        }
      }
    }

    setQueueIndex(nextIndex);
    await loadAndPlay(queue[nextIndex]);
  }, [queue, queueIndex, shuffle, repeatMode, loadAndPlay]);

  const playPrevious = useCallback(async () => {
    if (queue.length === 0) return;

    // If more than 3 seconds in, restart current song
    if (position > 3000) {
      await seek(0);
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

  // Format time helper
  const formatTime = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <PlayerContext.Provider value={{
      // State
      currentSong,
      queue,
      queueIndex,
      isPlaying,
      isLoading,
      position,
      duration,
      shuffle,
      repeatMode,

      // Actions
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

      // Helpers
      formatTime,
      progress: duration > 0 ? position / duration : 0,
    }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within PlayerProvider');
  return context;
}

export default PlayerContext;
