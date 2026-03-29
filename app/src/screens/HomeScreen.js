import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Image, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import SongItem from '../components/SongItem';
import PlaylistCard from '../components/PlaylistCard';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { play } = usePlayer();
  const [recentSongs, setRecentSongs] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [topSongs, setTopSongs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [songsRes, playlistsRes, recentRes, popularRes] = await Promise.all([
        api.getSongs({ sort: 'newest', limit: 20 }),
        api.getPlaylists(),
        api.getRecentlyPlayed().catch(() => ({ songs: [] })),
        api.getSongs({ sort: 'popular', limit: 10 }),
      ]);

      setAllSongs(songsRes.songs || []);
      setPlaylists(playlistsRes.playlists || []);
      setRecentSongs(recentRes.songs || []);
      setTopSongs(popularRes.songs || []);
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handlePlaySong = (songs, index) => {
    play(songs, index);
    navigation.navigate('Player');
  };

  const handleToggleLike = async (song) => {
    try {
      const result = await api.toggleLike(song.id);
      // Update local state
      const updateSongs = (list) =>
        list.map(s => s.id === song.id ? { ...s, is_liked: result.liked } : s);
      setAllSongs(updateSongs);
      setRecentSongs(updateSongs);
      setTopSongs(updateSongs);
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.primaryDark + '40', colors.background]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.username}>{user?.username || 'Music Lover'}</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => {}}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Quick Play - Recently Played Grid */}
      {recentSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.quickPlayGrid}>
            {recentSongs.slice(0, 6).map((song, index) => (
              <TouchableOpacity
                key={song.id}
                style={styles.quickPlayItem}
                onPress={() => handlePlaySong(recentSongs, index)}
                activeOpacity={0.8}
              >
                <View style={styles.quickPlayCover}>
                  {api.getCoverURL(song.cover_path) ? (
                    <Image source={{ uri: api.getCoverURL(song.cover_path) }} style={styles.quickPlayImage} />
                  ) : (
                    <View style={[styles.quickPlayImage, styles.quickPlayPlaceholder]}>
                      <Ionicons name="musical-note" size={16} color={colors.primary} />
                    </View>
                  )}
                </View>
                <Text style={styles.quickPlayTitle} numberOfLines={2}>{song.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Playlists */}
      {playlists.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Playlists</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Library')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={playlists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <PlaylistCard
                playlist={item}
                onPress={(p) => navigation.navigate('Playlist', { playlistId: p.id })}
              />
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Top Songs */}
      {topSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Played</Text>
          </View>
          <FlatList
            horizontal
            data={topSongs.slice(0, 8)}
            keyExtractor={(item) => `top-${item.id}`}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                style={styles.topSongCard}
                onPress={() => handlePlaySong(topSongs, index)}
                activeOpacity={0.8}
              >
                <View style={styles.topSongCover}>
                  {api.getCoverURL(item.cover_path) ? (
                    <Image source={{ uri: api.getCoverURL(item.cover_path) }} style={styles.topSongImage} />
                  ) : (
                    <View style={[styles.topSongImage, styles.topSongPlaceholder]}>
                      <Ionicons name="musical-note" size={24} color={colors.primary} />
                    </View>
                  )}
                  <View style={styles.playCountBadge}>
                    <Text style={styles.playCountText}>{item.play_count} plays</Text>
                  </View>
                </View>
                <Text style={styles.topSongTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.topSongArtist} numberOfLines={1}>{item.artist}</Text>
              </TouchableOpacity>
            )}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Recently Added */}
      {allSongs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Added</Text>
          </View>
          {allSongs.slice(0, 10).map((song, index) => (
            <SongItem
              key={song.id}
              song={song}
              index={index}
              onPress={() => handlePlaySong(allSongs, index)}
              onLike={handleToggleLike}
            />
          ))}
        </View>
      )}

      {/* Empty State */}
      {allSongs.length === 0 && playlists.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={64} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No music yet!</Text>
          <Text style={styles.emptySubtitle}>Upload your first song to get started</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => navigation.navigate('Upload')}
          >
            <Ionicons name="add" size={20} color={colors.text} />
            <Text style={styles.uploadButtonText}>Upload Music</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom padding for mini player */}
      <View style={{ height: 100 }} />
    </ScrollView>
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
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  username: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
  },
  seeAll: {
    fontSize: fontSize.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
  },

  // Quick Play Grid
  quickPlayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  quickPlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: (SCREEN_WIDTH - spacing.md * 2 - spacing.sm) / 2 - 1,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  quickPlayCover: {
    width: 48,
    height: 48,
  },
  quickPlayImage: {
    width: 48,
    height: 48,
  },
  quickPlayPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickPlayTitle: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },

  // Top Songs
  topSongCard: {
    width: 140,
    marginRight: spacing.md,
  },
  topSongCover: {
    width: 140,
    height: 140,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  topSongImage: {
    width: 140,
    height: 140,
  },
  topSongPlaceholder: {
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playCountBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    right: spacing.xs,
    backgroundColor: colors.overlay,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  playCountText: {
    color: colors.text,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  topSongTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  topSongArtist: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xxl,
  },
  emptyTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  uploadButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
