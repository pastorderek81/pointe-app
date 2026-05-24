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
import { MessageCard } from './MessageCard';
import { SectionHeader } from '../../components/SectionHeader';
import {
  fetchAllSeries,
  fetchPlaylistVideos,
  YouTubeSeries,
  YouTubeVideo,
  youtubeWatchUrl,
} from './youtube';
import { useCurrentSeries } from '../home/series';
import { useSavedSermons } from './savedSermons';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';
import { config, isPlaceholder } from '../../config';

const FALLBACK = require('../../../assets/hero-messages.jpg');

export function MediaScreen({ navigation }: any) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  const [allSeries, setAllSeries] = useState<YouTubeSeries[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { series } = useCurrentSeries();
  const { saved, isSaved, toggle: toggleSaved } = useSavedSermons();

  const load = useCallback(async () => {
    setError(null);
    if (!series.id || series.id === 'fallback') return;
    try {
      const [v, s] = await Promise.all([
        fetchPlaylistVideos(series.id, 1),
        fetchAllSeries(25),
      ]);
      setVideos(v);
      setAllSeries(s);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load videos');
    }
  }, [series.id]);

  useEffect(() => {
    if (isPlaceholder(config.youtubeApiKey)) {
      setError('YouTube API key not yet configured. Add it in app.json → extra.youtubeApiKey.');
    } else {
      load();
    }
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const featured = videos?.[0];
  const seriesList = allSeries ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={typography.label}>MESSAGES</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>Sermons</Text>
          <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
            Catch up on this week's message or dig into a series.
          </Text>
        </View>

        {error ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>{error}</Text>
            </View>
          </View>
        ) : null}

        {!videos && !error ? (
          <ActivityIndicator color={colors.skyDeep} style={{ marginTop: spacing.xl }} />
        ) : null}

        {featured ? (
          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <MessageCard
              thumbnailUrl={featured.thumbnailUrl}
              fallbackSource={FALLBACK}
              title={featured.title}
              meta={new Date(featured.publishedAt).toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              onPress={() => Linking.openURL(youtubeWatchUrl(featured.id))}
              saved={isSaved(featured.id)}
              onToggleSave={() =>
                toggleSaved({
                  id: featured.id,
                  title: featured.title,
                  thumbnailUrl: featured.thumbnailUrl,
                  publishedAt: featured.publishedAt,
                })
              }
            />
          </View>
        ) : null}

        {saved.length > 0 ? (
          <>
            <SectionHeader title="Saved" />
            <View style={styles.list}>
              {saved.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => Linking.openURL(youtubeWatchUrl(v.id))}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <Image source={{ uri: v.thumbnailUrl }} style={styles.thumb} />
                  <View style={styles.rowText}>
                    <Text style={typography.h3} numberOfLines={2}>
                      {v.title}
                    </Text>
                    <Text style={[typography.small, { marginTop: spacing.xs }]}>
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
                    <Text style={[styles.rowSaveGlyph, { color: colors.peachDeep }]}>
                      ♥
                    </Text>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {seriesList.length > 0 ? (
          <>
            <SectionHeader title="All series" />
            <View style={styles.list}>
              {seriesList.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() =>
                    navigation.navigate('SeriesDetail', {
                      seriesId: s.id,
                      seriesTitle: s.title,
                      seriesSubtitle: s.subtitle,
                      seriesImageUrl: s.imageUrl,
                    })
                  }
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <Image source={{ uri: s.imageUrl }} style={styles.thumb} />
                  <View style={styles.rowText}>
                    <Text style={typography.h3} numberOfLines={2}>
                      {s.title}
                    </Text>
                    {s.subtitle ? (
                      <Text
                        style={[typography.small, { marginTop: spacing.xs }]}
                        numberOfLines={2}
                      >
                        {s.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.paper },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.lg,
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
