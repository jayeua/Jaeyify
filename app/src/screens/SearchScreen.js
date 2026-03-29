import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePlayer } from '../context/PlayerContext';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import SongItem from '../components/SongItem';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SearchScreen({ navigation }) {
  const { play } = usePlayer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [allSongs, setAllSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadBrowseData();
  }, []);

  const loadBrowseData = async () => {
    try {
      const [artistsRes, albumsRes, songsRes] = await Promise.all([
        api.getArtists(),
        api.getAlbums(),
        api.getSongs({ limit: 100 }),
      ]);
      setArtists(artistsRes.artists || []);
      setAlbums(albumsRes.albums || []);
      setAllSongs(songsRes.songs || []);
    } catch (err) {
      console.error('Failed to load browse data:', err);
    }
  };

  const handleSearch = useCallback(async (text) => {
    setQuery(text);
    if (!text.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const data = await api.getSongs({ search: text.trim(), limit: 50 });
      setResults(data.songs || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePlaySong = (songs, index) => {
    play(songs, index);
    navigation.navigate('Player');
  };

  const handleToggleLike = async (song) => {
    try {
      const result = await api.toggleLike(song.id);
      setResults(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: result.liked } : s));
      setAllSongs(prev => prev.map(s => s.id === song.id ? { ...s, is_liked: result.liked } : s));
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleArtistPress = async (artistName) => {
    setQuery(artistName);
    setActiveTab('all');
    handleSearch(artistName);
  };

  const renderBrowse = () => (
    <FlatList
      data={[]}
      ListHeaderComponent={
        <>
          {/* Artists */}
          {artists.length > 0 && (
            <View style={styles.browseSection}>
              <Text style={styles.browseSectionTitle}>Artists</Text>
              <FlatList
                horizontal
                data={artists}
                keyExtractor={(item) => item.artist}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.artistCard}
                    onPress={() => handleArtistPress(item.artist)}
                  >
                    <View style={styles.artistAvatar}>
                      {api.getCoverURL(item.cover_path) ? (
                        <Image source={{ uri: api.getCoverURL(item.cover_path) }} style={styles.artistImage} />
                      ) : (
                        <Ionicons name="person" size={28} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
                    <Text style={styles.artistSongCount}>{item.song_count} songs</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              />
            </View>
          )}

          {/* Albums */}
          {albums.length > 0 && (
            <View style={styles.browseSection}>
              <Text style={styles.browseSectionTitle}>Albums</Text>
              <FlatList
                horizontal
                data={albums}
                keyExtractor={(item, idx) => `${item.album}-${idx}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.albumCard}
                    onPress={() => handleArtistPress(item.album)}
                  >
                    <View style={styles.albumCover}>
                      {api.getCoverURL(item.cover_path) ? (
                        <Image source={{ uri: api.getCoverURL(item.cover_path) }} style={styles.albumImage} />
                      ) : (
                        <Ionicons name="disc" size={28} color={colors.primary} />
                      )}
                    </View>
                    <Text style={styles.albumName} numberOfLines={1}>{item.album}</Text>
                    <Text style={styles.albumArtist} numberOfLines={1}>{item.artist}</Text>
                  </TouchableOpacity>
                )}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
              />
            </View>
          )}

          {/* All Songs */}
          {allSongs.length > 0 && (
            <View style={styles.browseSection}>
              <Text style={styles.browseSectionTitle}>All Songs</Text>
            </View>
          )}
        </>
      }
      renderItem={null}
      ListFooterComponent={
        <View>
          {allSongs.map((song, index) => (
            <SongItem
              key={song.id}
              song={song}
              index={index}
              onPress={() => handlePlaySong(allSongs, index)}
              onLike={handleToggleLike}
            />
          ))}
          <View style={{ height: 120 }} />
        </View>
      }
      showsVerticalScrollIndicator={false}
    />
  );

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (results.length === 0 && hasSearched) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color={colors.textMuted} />
          <Text style={styles.noResultsText}>No results for "{query}"</Text>
          <Text style={styles.noResultsSubtext}>Check spelling or try different keywords</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={results}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <SongItem
            song={item}
            index={index}
            onPress={() => handlePlaySong(results, index)}
            onLike={handleToggleLike}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Songs, artists, albums..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {query.length > 0 ? renderResults() : renderBrowse()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  noResultsText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  noResultsSubtext: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.sm,
  },

  // Browse
  browseSection: {
    marginTop: spacing.xxl,
  },
  browseSectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },

  // Artists
  artistCard: {
    alignItems: 'center',
    marginRight: spacing.lg,
    width: 100,
  },
  artistAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  artistImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  artistName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  artistSongCount: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },

  // Albums
  albumCard: {
    marginRight: spacing.md,
    width: 130,
  },
  albumCover: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLighter,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  albumImage: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.md,
  },
  albumName: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  albumArtist: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
});
