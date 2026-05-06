import React, { useCallback, useEffect, useState } from 'react';
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
import { MessageCard } from '../components/MessageCard';
import { SectionHeader } from '../components/SectionHeader';
import { fetchLatestVideos, YouTubeVideo, youtubeWatchUrl } from '../youtube';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { config, isPlaceholder } from '../config';

const FALLBACK = require('../../assets/hero-messages.jpg');

export function MediaScreen() {
  const [videos, setVideos] = useState<YouTubeVideo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const v = await fetchLatestVideos(25);
      setVideos(v);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load videos');
    }
  }, []);

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
  const rest = videos?.slice(1) ?? [];

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
            />
          </View>
        ) : null}

        {rest.length > 0 ? (
          <>
            <SectionHeader title="Earlier messages" />
            <View style={styles.list}>
              {rest.map((v) => (
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
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  error: {
    backgroundColor: colors.peachSoft,
    borderColor: colors.peach,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
});
