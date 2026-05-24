import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchPlaylistVideos, YouTubeVideo, youtubeWatchUrl } from './youtube';
import { useSavedSermons } from './savedSermons';
import {
  Palette,
  radius,
  spacing,
  Typography,
  useColors,
  useTypography,
} from '../../theme';

export function SeriesDetailScreen({ route, navigation }: any) {
  const { seriesId, seriesTitle, seriesSubtitle, seriesImageUrl } =
    route?.params ?? {};
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(
    () => makeStyles(colors, typography),
    [colors, typography],
  );
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isSaved, toggle: toggleSaved } = useSavedSermons();

  const load = useCallback(async () => {
    setError(null);
    if (!seriesId) return;
    try {
      const v = await fetchPlaylistVideos(seriesId, 50);
      setVideos(v);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load videos');
    }
  }, [seriesId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          {seriesImageUrl ? (
            <Image source={{ uri: seriesImageUrl }} style={styles.heroImg} />
          ) : null}
          <Text style={typography.label}>SERIES</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>
            {seriesTitle ?? 'Series'}
          </Text>
          {seriesSubtitle ? (
            <Text
              style={[
                typography.body,
                { color: colors.textMid, marginTop: spacing.sm },
              ]}
            >
              {seriesSubtitle}
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>
                {error}
              </Text>
            </View>
          </View>
        ) : null}

        {!videos && !error ? (
          <ActivityIndicator
            color={colors.skyDeep}
            style={{ marginTop: spacing.xl }}
          />
        ) : null}

        {videos && videos.length > 0 ? (
          <View style={styles.list}>
            {videos.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => Linking.openURL(youtubeWatchUrl(v.id))}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Image source={{ uri: v.thumbnailUrl }} style={styles.thumb} />
                <View style={styles.rowText}>
                  <Text style={typography.h3} numberOfLines={2}>
                    {v.title}
                  </Text>
                  <Text
                    style={[typography.small, { marginTop: spacing.xs }]}
                  >
                    {new Date(v.publishedAt).toLocaleDateString()}
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    toggleSaved({
                      id: v.id,
                      title: v.title,
                      thumbnailUrl: v.thumbnailUrl,
                      publishedAt: v.publishedAt,
                    })
                  }
                  hitSlop={10}
                  style={styles.rowSaveBtn}
                >
                  <Text
                    style={[
                      styles.rowSaveGlyph,
                      isSaved(v.id) && { color: colors.peachDeep },
                    ]}
                  >
                    {isSaved(v.id) ? '♥' : '♡'}
                  </Text>
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}

        {videos && videos.length === 0 && !error ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
            <Text style={[typography.body, { color: colors.textMid }]}>
              No videos in this series yet.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    topBar: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xs,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    backGlyph: {
      fontSize: 28,
      color: colors.text,
      lineHeight: 30,
      marginTop: -2,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
    },
    heroImg: {
      width: '100%',
      height: 180,
      borderRadius: radius.lg,
      marginBottom: spacing.md,
      backgroundColor: colors.surface,
    },
    list: { paddingHorizontal: spacing.lg, gap: spacing.md },
    row: {
      flexDirection: 'row',
      backgroundColor: colors.white,
      borderRadius: radius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.line,
    },
    thumb: {
      width: 130,
      height: 76,
      backgroundColor: colors.surface,
    },
    rowText: {
      flex: 1,
      paddingHorizontal: spacing.md,
      justifyContent: 'center',
    },
    rowSaveBtn: {
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowSaveGlyph: {
      fontSize: 22,
      lineHeight: 24,
      color: colors.muted,
    },
    error: {
      backgroundColor: colors.peachSoft,
      borderColor: colors.peach,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
  });
}
