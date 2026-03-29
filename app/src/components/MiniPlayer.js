import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MiniPlayer({ onPress }) {
  const { currentSong, isPlaying, togglePlayPause, playNext, progress, isLoading } = usePlayer();

  if (!currentSong) return null;

  const coverUrl = api.getCoverURL(currentSong.cover_path);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.content}>
        {/* Cover art */}
        <View style={styles.coverContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="musical-note" size={20} color={colors.textMuted} />
            </View>
          )}
        </View>

        {/* Song info */}
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentSong.artist}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={togglePlayPause}
            style={styles.playButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isLoading ? (
              <Ionicons name="hourglass-outline" size={26} color={colors.text} />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={26}
                color={colors.text}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={playNext}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="play-forward" size={22} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.playerBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
  },
  progressContainer: {
    height: 2,
    backgroundColor: colors.progressBarBg,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  coverContainer: {
    marginRight: spacing.md,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  artist: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  playButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
