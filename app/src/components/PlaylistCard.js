import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import api from '../services/api';

export default function PlaylistCard({ playlist, onPress, size = 'medium' }) {
  const coverUrl = api.getCoverURL(playlist.cover_path);
  const isLarge = size === 'large';
  const isSmall = size === 'small';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isLarge && styles.containerLarge,
        isSmall && styles.containerSmall,
      ]}
      onPress={() => onPress && onPress(playlist)}
      activeOpacity={0.8}
    >
      <View style={[styles.coverContainer, isLarge && styles.coverLarge, isSmall && styles.coverSmall]}>
        {coverUrl ? (
          <Image
            source={{ uri: coverUrl }}
            style={[styles.cover, isLarge && styles.coverLarge, isSmall && styles.coverSmall]}
          />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder, isLarge && styles.coverLarge, isSmall && styles.coverSmall]}>
            <Ionicons
              name="musical-notes"
              size={isSmall ? 20 : isLarge ? 36 : 28}
              color={colors.primary}
            />
          </View>
        )}
      </View>

      <Text style={[styles.name, isSmall && styles.nameSmall]} numberOfLines={2}>
        {playlist.name}
      </Text>

      {!isSmall && (
        <Text style={styles.meta} numberOfLines={1}>
          {playlist.song_count || 0} songs
          {playlist.created_by_name ? ` · ${playlist.created_by_name}` : ''}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 150,
    marginRight: spacing.md,
  },
  containerLarge: {
    width: 180,
  },
  containerSmall: {
    width: 120,
  },
  coverContainer: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  cover: {
    width: 150,
    height: 150,
  },
  coverLarge: {
    width: 180,
    height: 180,
    borderRadius: borderRadius.lg,
  },
  coverSmall: {
    width: 120,
    height: 120,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  nameSmall: {
    fontSize: fontSize.sm,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
