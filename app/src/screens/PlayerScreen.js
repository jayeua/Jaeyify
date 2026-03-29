import React, { useState, useEffect } from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import api from '../services/api';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PlayerScreen({ navigation }) {
  const {
    currentSong, isPlaying, isLoading, position, duration, progress,
    shuffle, repeatMode, togglePlayPause, playNext, playPrevious,
    toggleShuffle, toggleRepeat, seek, formatTime,
  } = usePlayer();
  const [isLiked, setIsLiked] = useState(false);
  const [qualityInfo, setQualityInfo] = useState(null);

  useEffect(() => {
    if (currentSong) {
      setIsLiked(currentSong.is_liked || false);
      // Fetch audio quality info
      api.getAudioQuality(currentSong.id)
        .then(setQualityInfo)
        .catch(() => setQualityInfo(null));
    }
  }, [currentSong]);

  if (!currentSong) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="musical-notes-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyText}>No song playing</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.emptyLink}>Browse music</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const coverUrl = api.getCoverURL(currentSong.cover_path);

  const handleLike = async () => {
    try {
      const result = await api.toggleLike(currentSong.id);
      setIsLiked(result.liked);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleSeek = (value) => {
    seek(value * duration);
  };

  return (
    <LinearGradient
      colors={[colors.primaryDark + '60', colors.background, colors.background]}
      locations={[0, 0.5, 1]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>PLAYING FROM</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentSong.album || 'Your Library'}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Album Art */}
      <View style={styles.artContainer}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArt, styles.albumArtPlaceholder]}>
            <Ionicons name="musical-notes" size={80} color={colors.primary} />
          </View>
        )}
      </View>

      {/* Song Info */}
      <View style={styles.infoContainer}>
        <View style={styles.infoLeft}>
          <Text style={styles.songTitle} numberOfLines={1}>{currentSong.title}</Text>
          <Text style={styles.songArtist} numberOfLines={1}>{currentSong.artist}</Text>
        </View>
        <TouchableOpacity onPress={handleLike} style={styles.likeButton}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={isLiked ? colors.heart : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.sliderContainer}>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <TouchableOpacity
            style={[styles.progressThumb, { left: `${Math.min(progress * 100, 100)}%` }]}
            activeOpacity={0.8}
          />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={toggleShuffle} style={styles.controlButton}>
          <Ionicons
            name="shuffle"
            size={22}
            color={shuffle ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={playPrevious} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={28} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlayPause}
          style={styles.playButton}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <Ionicons name="hourglass-outline" size={32} color={colors.textInverse} />
          ) : (
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={32}
              color={colors.textInverse}
              style={!isPlaying ? { marginLeft: 3 } : {}}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={playNext} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={28} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleRepeat} style={styles.controlButton}>
          <Ionicons
            name={repeatMode === 'one' ? 'repeat' : 'repeat'}
            size={22}
            color={repeatMode !== 'off' ? colors.primary : colors.textSecondary}
          />
          {repeatMode === 'one' && (
            <View style={styles.repeatOneDot}>
              <Text style={styles.repeatOneText}>1</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Audio Quality Badge */}
      {qualityInfo && (
        <View style={styles.qualityBadge}>
          <Ionicons
            name={qualityInfo.lossless ? 'diamond' : 'stats-chart'}
            size={12}
            color={qualityInfo.lossless ? colors.secondary : colors.primaryLight}
          />
          <Text style={[
            styles.qualityText,
            qualityInfo.lossless && styles.qualityTextHiFi,
          ]}>
            {qualityInfo.quality_label}
          </Text>
          {qualityInfo.sample_rate_khz && (
            <Text style={styles.qualityDetail}>
              {qualityInfo.sample_rate_khz}kHz{qualityInfo.bit_depth ? ` / ${qualityInfo.bit_depth}bit` : ''}
            </Text>
          )}
        </View>
      )}

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.bottomButton}>
          <Ionicons name="phone-portrait-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton}>
          <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton}>
          <Ionicons name="list-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const ARTWORK_SIZE = Math.min(SCREEN_WIDTH - 64, 360);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xxl,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    marginTop: spacing.lg,
  },
  emptyLink: {
    color: colors.primary,
    fontSize: fontSize.md,
    marginTop: spacing.md,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: spacing.xl,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '600',
    letterSpacing: 1,
  },
  headerTitle: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },

  // Album Art
  artContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  albumArt: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: borderRadius.lg,
  },
  albumArtPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Song Info
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  infoLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  songTitle: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  songArtist: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  likeButton: {
    padding: spacing.sm,
  },

  // Progress
  progressContainer: {
    marginBottom: spacing.lg,
  },
  sliderContainer: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  progressBackground: {
    height: 4,
    backgroundColor: colors.progressBarBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    marginLeft: -7,
    top: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  timeText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: '500',
  },

  // Controls
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xxxl,
  },
  controlButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneDot: {
    position: 'absolute',
    bottom: 2,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  repeatOneText: {
    color: colors.text,
    fontSize: 8,
    fontWeight: '800',
  },

  // Quality Badge
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  qualityText: {
    color: colors.primaryLight,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  qualityTextHiFi: {
    color: colors.secondary,
  },
  qualityDetail: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
  },

  // Bottom
  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxxl,
  },
  bottomButton: {
    padding: spacing.sm,
  },
});
