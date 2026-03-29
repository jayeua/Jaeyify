import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import SongItem from '../components/SongItem';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlaylistScreen({ route, navigation }) {
  const { playlistId } = route.params;
  const { play } = usePlayer();
  const [playlist, setPlaylist] = useState(null);
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPlaylist = useCallback(async () => {
    try {
      const data = await api.getPlaylist(playlistId);
      setPlaylist(data);
      setSongs(data.songs || []);
    } catch (err) {
      console.error('Failed to load playlist:', err);
      Alert.alert('Error', 'Failed to load playlist');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  useFocusEffect(
    useCallback(() => {
      loadPlaylist();
    }, [loadPlaylist])
  );

  const handlePlayAll = () => {
    if (songs.length > 0) {
      play(songs, 0);
      navigation.navigate('Player');
    }
  };

  const handlePlaySong = (index) => {
    play(songs, index);
    navigation.navigate('Player');
  };

  const handleToggleLike = async (song) => {
    try {
      const result = await api.toggleLike(song.id);
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: result.liked } : s));
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleRemoveFromPlaylist = (song) => {
    Alert.alert('Remove Song', `Remove "${song.title}" from this playlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.removeFromPlaylist(playlistId, song.id);
            setSongs(prev => prev.filter(s => s.id !== song.id));
          } catch (err) {
            Alert.alert('Error', 'Failed to remove song');
          }
        }
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const coverUrl = api.getCoverURL(playlist?.cover_path);

  return (
    <View style={styles.container}>
      <FlatList
        data={songs}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={
          <View>
            {/* Header with back button */}
            <LinearGradient
              colors={[colors.primaryDark + '50', colors.background]}
              style={styles.headerGradient}
            >
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={colors.text} />
              </TouchableOpacity>

              {/* Playlist Cover */}
              <View style={styles.coverContainer}>
                {coverUrl ? (
                  <Image source={{ uri: coverUrl }} style={styles.cover} />
                ) : (
                  <View style={[styles.cover, styles.coverPlaceholder]}>
                    <Ionicons name="musical-notes" size={48} color={colors.primary} />
                  </View>
                )}
              </View>

              {/* Playlist Info */}
              <Text style={styles.playlistName}>{playlist?.name}</Text>
              {playlist?.description ? (
                <Text style={styles.playlistDescription}>{playlist.description}</Text>
              ) : null}
              <Text style={styles.playlistMeta}>
                {playlist?.created_by_name || 'You'} · {songs.length} songs
              </Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.shuffleButton}>
                  <Ionicons name="shuffle" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.playAllButton}
                  onPress={handlePlayAll}
                >
                  <Ionicons name="play" size={28} color={colors.textInverse} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        }
        renderItem={({ item, index }) => (
          <SongItem
            song={item}
            index={index}
            showIndex
            onPress={() => handlePlaySong(index)}
            onLike={handleToggleLike}
            onOptions={() => handleRemoveFromPlaylist(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>This playlist is empty</Text>
            <Text style={styles.emptySubtext}>Add songs from the search or home screen</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerGradient: {
    paddingTop: 60,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  coverContainer: {
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: spacing.xxl,
  },
  cover: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
  },
  coverPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistName: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  playlistDescription: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.xxl,
  },
  playlistMeta: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xxl,
  },
  shuffleButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playAllButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl + 20,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },
});
