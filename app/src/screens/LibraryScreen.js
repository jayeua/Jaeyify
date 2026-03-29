import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import SongItem from '../components/SongItem';
import PlaylistCard from '../components/PlaylistCard';
import api from '../services/api';

export default function LibraryScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { play } = usePlayer();
  const [activeTab, setActiveTab] = useState('playlists');
  const [playlists, setPlaylists] = useState([]);
  const [likedSongs, setLikedSongs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [playlistsRes, likedRes] = await Promise.all([
        api.getMyPlaylists(),
        api.getLikedSongs(),
      ]);
      setPlaylists(playlistsRes.playlists || []);
      setLikedSongs(likedRes.songs || []);
    } catch (err) {
      console.error('Failed to load library:', err);
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

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('name', newPlaylistName.trim());

      await api.createPlaylist(formData);
      setShowCreateModal(false);
      setNewPlaylistName('');
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setCreating(false);
    }
  };

  const handlePlaySong = (songs, index) => {
    play(songs, index);
    navigation.navigate('Player');
  };

  const handleToggleLike = async (song) => {
    try {
      const result = await api.toggleLike(song.id);
      if (!result.liked) {
        setLikedSongs(prev => prev.filter(s => s.id !== song.id));
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const tabs = [
    { key: 'playlists', label: 'Playlists', icon: 'musical-notes-outline' },
    { key: 'liked', label: 'Liked', icon: 'heart-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <Text style={styles.headerTitle}>Your Library</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={28} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'playlists' && (
            <View>
              {/* Liked Songs Shortcut */}
              <TouchableOpacity
                style={styles.likedSongsCard}
                onPress={() => setActiveTab('liked')}
              >
                <View style={styles.likedSongsGradient}>
                  <Ionicons name="heart" size={24} color={colors.text} />
                </View>
                <View style={styles.likedSongsInfo}>
                  <Text style={styles.likedSongsTitle}>Liked Songs</Text>
                  <Text style={styles.likedSongsCount}>{likedSongs.length} songs</Text>
                </View>
              </TouchableOpacity>

              {/* Playlists Grid */}
              {playlists.length > 0 ? (
                <View style={styles.playlistGrid}>
                  {playlists.map(playlist => (
                    <View key={playlist.id} style={styles.playlistGridItem}>
                      <PlaylistCard
                        playlist={playlist}
                        onPress={(p) => navigation.navigate('Playlist', { playlistId: p.id })}
                        size="small"
                      />
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySection}>
                  <Text style={styles.emptySectionText}>No playlists yet</Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => setShowCreateModal(true)}
                  >
                    <Text style={styles.createButtonText}>Create Playlist</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'liked' && (
            <View>
              {likedSongs.length > 0 ? (
                <>
                  {/* Play All */}
                  <TouchableOpacity
                    style={styles.playAllButton}
                    onPress={() => handlePlaySong(likedSongs, 0)}
                  >
                    <Ionicons name="play-circle" size={52} color={colors.primary} />
                  </TouchableOpacity>

                  {likedSongs.map((song, index) => (
                    <SongItem
                      key={song.id}
                      song={song}
                      index={index}
                      onPress={() => handlePlaySong(likedSongs, index)}
                      onLike={handleToggleLike}
                    />
                  ))}
                </>
              ) : (
                <View style={styles.emptySection}>
                  <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptySectionText}>No liked songs yet</Text>
                  <Text style={styles.emptySectionSubtext}>Tap the heart on any song to save it here</Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Create Playlist Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Playlist</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewPlaylistName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCreateButton, !newPlaylistName.trim() && styles.modalCreateButtonDisabled]}
                onPress={handleCreatePlaylist}
                disabled={creating || !newPlaylistName.trim()}
              >
                {creating ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 60,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.sm,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.text,
  },

  // Liked Songs Card
  likedSongsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
  },
  likedSongsGradient: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  likedSongsInfo: {
    flex: 1,
  },
  likedSongsTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  likedSongsCount: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },

  // Playlist Grid
  playlistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  playlistGridItem: {
    marginBottom: spacing.sm,
  },

  // Play All
  playAllButton: {
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },

  // Empty
  emptySection: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl + 20,
    paddingHorizontal: spacing.xxl,
  },
  emptySectionText: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySectionSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  createButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: fontSize.md,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  modalInput: {
    backgroundColor: colors.surfaceLighter,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: fontSize.lg,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.round,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalCreateButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalCreateButtonDisabled: {
    opacity: 0.5,
  },
  modalCreateText: {
    color: colors.text,
    fontWeight: '700',
  },
});
