import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import api from '../services/api';

export default function SongItem({ song, index, onPress, onLike, onOptions, showIndex = false, compact = false }) {
  const coverUrl = api.getCoverURL(song.cover_path);

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.containerCompact]}
      onPress={() => onPress && onPress(song)}
      activeOpacity={0.7}
    >
      {showIndex && (
        <Text style={styles.index}>{index + 1}</Text>
      )}

      {/* Cover */}
      <View style={[styles.coverContainer, compact && styles.coverContainerCompact]}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={[styles.cover, compact && styles.coverCompact]} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, compact && styles.coverCompact]}>
            <Ionicons name="musical-note" size={compact ? 16 : 20} color={colors.textMuted} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}{song.album && song.album !== 'Unknown Album' ? ` · ${song.album}` : ''}
        </Text>
      </View>

      {/* Duration */}
      {!compact && song.duration > 0 && (
        <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
      )}

      {/* Like button */}
      {onLike && (
        <TouchableOpacity
          onPress={() => onLike(song)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.likeButton}
        >
          <Ionicons
            name={song.is_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={song.is_liked ? colors.heart : colors.textMuted}
          />
        </TouchableOpacity>
      )}

      {/* Options */}
      {onOptions && (
        <TouchableOpacity
          onPress={() => onOptions(song)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.optionsButton}
        >
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  containerCompact: {
    paddingVertical: spacing.xs + 2,
  },
  index: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    width: 28,
    textAlign: 'center',
  },
  coverContainer: {
    marginRight: spacing.md,
  },
  coverContainerCompact: {
    marginRight: spacing.sm,
  },
  cover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  coverCompact: {
    width: 40,
    height: 40,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginRight: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  titleCompact: {
    fontSize: fontSize.sm + 1,
  },
  artist: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  duration: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  likeButton: {
    padding: spacing.xs,
  },
  optionsButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
