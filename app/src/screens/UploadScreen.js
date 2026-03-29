import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, fontSize, borderRadius } from '../theme';
import api from '../services/api';

export default function UploadScreen({ navigation }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUri, setCoverUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [mode, setMode] = useState('single'); // single, batch, or url

  // URL import state
  const [importUrl, setImportUrl] = useState('');
  const [importStatus, setImportStatus] = useState(null); // { status, message, percent }

  const pickMusic = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        multiple: mode === 'batch',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (mode === 'batch') {
        setFiles(result.assets || []);
      } else {
        setFiles(result.assets ? [result.assets[0]] : []);
        // Auto-fill title from filename
        if (result.assets && result.assets[0]) {
          const name = result.assets[0].name.replace(/\.[^/.]+$/, '');
          if (!title) setTitle(name);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick file');
    }
  };

  const pickCover = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photo library');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      Alert.alert('No file selected', 'Please select a music file first');
      return;
    }

    setUploading(true);
    try {
      if (mode === 'batch' && files.length > 1) {
        // Batch upload
        const formData = new FormData();
        files.forEach((file, index) => {
          formData.append('music', {
            uri: file.uri,
            name: file.name || `song_${index}.mp3`,
            type: file.mimeType || 'audio/mpeg',
          });
        });

        setUploadProgress(`Uploading ${files.length} songs...`);
        const result = await api.uploadBatch(formData);
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => navigation.navigate('Home') }
        ]);
      } else {
        // Single upload
        const file = files[0];
        const formData = new FormData();

        formData.append('music', {
          uri: file.uri,
          name: file.name || 'song.mp3',
          type: file.mimeType || 'audio/mpeg',
        });

        if (title.trim()) formData.append('title', title.trim());
        if (artist.trim()) formData.append('artist', artist.trim());
        if (album.trim()) formData.append('album', album.trim());
        if (genre.trim()) formData.append('genre', genre.trim());

        if (coverUri) {
          formData.append('cover', {
            uri: coverUri,
            name: 'cover.jpg',
            type: 'image/jpeg',
          });
        }

        setUploadProgress('Uploading...');
        const result = await api.uploadSong(formData);
        Alert.alert('Success', `"${result.song.title}" uploaded!`, [
          { text: 'Upload More', onPress: resetForm },
          { text: 'Go Home', onPress: () => navigation.navigate('Home') }
        ]);
      }
    } catch (err) {
      Alert.alert('Upload Failed', err.message);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const resetForm = () => {
    setFiles([]);
    setTitle('');
    setArtist('');
    setAlbum('');
    setGenre('');
    setCoverUri(null);
  };

  const handleImportUrl = async () => {
    const trimmed = importUrl.trim();
    if (!trimmed) {
      Alert.alert('No URL', 'Please paste a YouTube or SoundCloud link');
      return;
    }

    const isValid = /(?:youtube\.com|youtu\.be|soundcloud\.com)/i.test(trimmed);
    if (!isValid) {
      Alert.alert('Invalid URL', 'Only YouTube and SoundCloud links are supported');
      return;
    }

    setUploading(true);
    setImportStatus({ status: 'fetching', message: 'Connecting...' });

    try {
      const result = await api.importFromUrl(trimmed, (progress) => {
        setImportStatus(progress);
      });

      if (result?.status === 'done') {
        setImportStatus(null);
        Alert.alert('Imported!', result.message || 'Song added to your library', [
          { text: 'Import Another', onPress: () => setImportUrl('') },
          { text: 'Go Home', onPress: () => navigation.navigate('Home') },
        ]);
      }
    } catch (err) {
      setImportStatus(null);
      Alert.alert('Import Failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Upload Music</Text>
          <Text style={styles.headerSubtitle}>Add your own songs to the library</Text>
        </View>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'single' && styles.modeButtonActive]}
            onPress={() => { setMode('single'); setFiles([]); }}
          >
            <Ionicons name="musical-note" size={18} color={mode === 'single' ? colors.text : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'single' && styles.modeTextActive]}>Single</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'batch' && styles.modeButtonActive]}
            onPress={() => { setMode('batch'); setFiles([]); }}
          >
            <Ionicons name="albums" size={18} color={mode === 'batch' ? colors.text : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'batch' && styles.modeTextActive]}>Batch</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'url' && styles.modeButtonActive]}
            onPress={() => { setMode('url'); setFiles([]); setImportStatus(null); }}
          >
            <Ionicons name="link" size={18} color={mode === 'url' ? colors.text : colors.textMuted} />
            <Text style={[styles.modeText, mode === 'url' && styles.modeTextActive]}>URL</Text>
          </TouchableOpacity>
        </View>

        {/* URL Import Mode */}
        {mode === 'url' && (
          <View style={styles.urlSection}>
            <View style={styles.urlIconContainer}>
              <Ionicons name="globe-outline" size={40} color={colors.primary} />
            </View>
            <Text style={styles.urlTitle}>Import from URL</Text>
            <Text style={styles.urlSubtitle}>
              Paste a YouTube or SoundCloud link to download and add to your library
            </Text>

            <TextInput
              style={styles.urlInput}
              placeholder="https://youtube.com/watch?v=... or soundcloud.com/..."
              placeholderTextColor={colors.textMuted}
              value={importUrl}
              onChangeText={setImportUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              selectTextOnFocus
            />

            {/* Supported platforms */}
            <View style={styles.platformsRow}>
              <View style={styles.platformBadge}>
                <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                <Text style={styles.platformText}>YouTube</Text>
              </View>
              <View style={styles.platformBadge}>
                <Ionicons name="cloud-outline" size={16} color="#FF5500" />
                <Text style={styles.platformText}>SoundCloud</Text>
              </View>
            </View>

            {/* Progress indicator */}
            {importStatus && (
              <View style={styles.importProgress}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.importProgressText}>{importStatus.message}</Text>
                {importStatus.percent !== undefined && (
                  <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${importStatus.percent}%` }]} />
                  </View>
                )}
              </View>
            )}

            {/* Import Button */}
            <TouchableOpacity
              style={[styles.uploadButton, (uploading || !importUrl.trim()) && styles.uploadButtonDisabled]}
              onPress={handleImportUrl}
              disabled={uploading || !importUrl.trim()}
            >
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color={colors.text} />
                  <Text style={styles.uploadButtonText}>Importing...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="download" size={22} color={colors.text} />
                  <Text style={styles.uploadButtonText}>Import Song</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.urlInfo}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
              <Text style={styles.urlInfoText}>
                The song will be downloaded as audio and added to your library with auto-detected title, artist, and cover art.
              </Text>
            </View>
          </View>
        )}

        {/* File Picker & Upload (non-URL modes) */}
        {mode !== 'url' && (
          <>
            <TouchableOpacity style={styles.filePicker} onPress={pickMusic}>
              <View style={styles.filePickerInner}>
                {files.length > 0 ? (
                  <>
                    <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                    <Text style={styles.filePickerText}>
                      {files.length === 1 ? files[0].name : `${files.length} files selected`}
                    </Text>
                    <Text style={styles.filePickerSubtext}>Tap to change</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={styles.filePickerText}>
                      {mode === 'batch' ? 'Select Music Files' : 'Select Music File'}
                    </Text>
                    <Text style={styles.filePickerSubtext}>MP3, WAV, FLAC, M4A, OGG, AAC</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Metadata (single mode only) */}
            {mode === 'single' && (
              <View style={styles.metadataSection}>
                <Text style={styles.sectionTitle}>Song Details</Text>
                <Text style={styles.sectionSubtitle}>Optional — metadata is auto-detected from the file</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Title</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Song title"
                    placeholderTextColor={colors.textMuted}
                    value={title}
                    onChangeText={setTitle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Artist</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Artist name"
                    placeholderTextColor={colors.textMuted}
                    value={artist}
                    onChangeText={setArtist}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Album</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Album"
                      placeholderTextColor={colors.textMuted}
                      value={album}
                      onChangeText={setAlbum}
                    />
                  </View>
                  <View style={{ width: spacing.md }} />
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Genre</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Genre"
                      placeholderTextColor={colors.textMuted}
                      value={genre}
                      onChangeText={setGenre}
                    />
                  </View>
                </View>

                {/* Cover Art */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cover Art</Text>
                  <TouchableOpacity style={styles.coverPicker} onPress={pickCover}>
                    {coverUri ? (
                      <View style={styles.coverPreview}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                        <Text style={styles.coverPickerText}>Cover selected</Text>
                        <Text style={styles.coverPickerSubtext}>Tap to change</Text>
                      </View>
                    ) : (
                      <View style={styles.coverPreview}>
                        <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                        <Text style={styles.coverPickerText}>Add cover art</Text>
                        <Text style={styles.coverPickerSubtext}>Auto-extracted if embedded</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {mode === 'batch' && files.length > 0 && (
              <View style={styles.batchInfo}>
                <Ionicons name="information-circle-outline" size={20} color={colors.primaryLight} />
                <Text style={styles.batchInfoText}>
                  Song metadata (title, artist, album, cover) will be automatically extracted from each file.
                </Text>
              </View>
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.uploadButton, (uploading || files.length === 0) && styles.uploadButtonDisabled]}
              onPress={handleUpload}
              disabled={uploading || files.length === 0}
            >
              {uploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color={colors.text} />
                  <Text style={styles.uploadButtonText}>{uploadProgress || 'Uploading...'}</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload" size={22} color={colors.text} />
                  <Text style={styles.uploadButtonText}>
                    Upload {files.length > 1 ? `${files.length} Songs` : 'Song'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: 60,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: fontSize.xxxl,
    fontWeight: '800',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xxl,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: fontSize.md,
  },
  modeTextActive: {
    color: colors.text,
  },

  // File Picker
  filePicker: {
    marginBottom: spacing.xxl,
  },
  filePickerInner: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.xl,
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filePickerText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  filePickerSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },

  // Metadata
  metadataSection: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputRow: {
    flexDirection: 'row',
  },

  // Cover Picker
  coverPicker: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  coverPickerText: {
    color: colors.text,
    fontSize: fontSize.md,
    flex: 1,
  },
  coverPickerSubtext: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },

  // Batch Info
  batchInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  batchInfoText: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    flex: 1,
    lineHeight: 20,
  },

  // Upload Button
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // URL Import
  urlSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  urlIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  urlTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  urlSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 20,
  },
  urlInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    color: colors.text,
    fontSize: fontSize.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginBottom: spacing.md,
  },
  platformsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  platformBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
  },
  platformText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  importProgress: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.sm,
    width: '100%',
  },
  importProgressText: {
    color: colors.primaryLight,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  urlInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.sm,
  },
  urlInfoText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    flex: 1,
    lineHeight: 18,
  },
});
