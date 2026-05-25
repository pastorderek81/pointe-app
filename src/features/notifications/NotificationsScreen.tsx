// Notifications history. Shows every push broadcast the church has sent
// (sourced from the proxy at /push/history), newest first. Anything that
// arrives while this screen is open is prepended live via the
// expo-notifications received-listener.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { Card } from '../../components/Card';
import { config, isPlaceholder } from '../../config';
import {
  Palette,
  radius,
  spacing,
  Typography,
  useColors,
  useTypography,
} from '../../theme';

type HistoryEntry = {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sentAt: number;
  sentCount?: number;
};

type HistoryResponse = { notifications: HistoryEntry[] };

function dedupe(entries: HistoryEntry[]): HistoryEntry[] {
  // Two entries are "the same" if their title+body+approximate-time match.
  // (Server records and live-listener records of the same broadcast can
  // arrive in either order with slightly different timestamps.)
  const seen = new Set<string>();
  const out: HistoryEntry[] = [];
  for (const e of entries) {
    const minute = Math.floor(e.sentAt / 60_000);
    const key = `${e.title}|${e.body}|${minute}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function NotificationsScreen({ navigation }: any) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Buffer for notifications that arrive while we're on this screen so they
  // survive subsequent server refreshes (server may take a few seconds to
  // surface the broadcast in /push/history).
  const liveRef = useRef<HistoryEntry[]>([]);

  const load = useCallback(async () => {
    setError(null);
    if (isPlaceholder(config.proxyUrl)) {
      setEntries([]);
      return;
    }
    try {
      const res = await fetch(
        `${config.proxyUrl.replace(/\/$/, '')}/push/history?limit=50&t=${Date.now()}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as HistoryResponse;
      const server = Array.isArray(json?.notifications) ? json.notifications : [];
      // Merge with any live-listener entries from this session.
      const merged = dedupe([...liveRef.current, ...server]).sort(
        (a, b) => b.sentAt - a.sentAt,
      );
      setEntries(merged);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load notifications');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: any notification that arrives while this screen is mounted
  // gets prepended without waiting for the next server refresh.
  useEffect(() => {
    const sub = Notifications.addNotificationReceivedListener((notif) => {
      const content = notif.request.content;
      const entry: HistoryEntry = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: content.title ?? 'New notification',
        body: content.body ?? '',
        data: (content.data ?? {}) as Record<string, unknown>,
        sentAt: Date.now(),
      };
      liveRef.current = [entry, ...liveRef.current].slice(0, 20);
      setEntries((prev) =>
        dedupe([entry, ...(prev ?? [])]).sort((a, b) => b.sentAt - a.sentAt),
      );
    });
    return () => sub.remove();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleTap = (entry: HistoryEntry) => {
    const url = typeof entry.data?.url === 'string' ? entry.data.url : null;
    if (url) Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={typography.label}>RECENT</Text>
        <Text style={[typography.display, { marginTop: spacing.xs }]}>Notifications</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {entries === null && !error && (
          <ActivityIndicator color={colors.skyDeep} style={{ marginTop: spacing.xl }} />
        )}

        {error && (
          <View style={styles.error}>
            <Text style={[typography.body, { color: colors.peachInk }]}>{error}</Text>
          </View>
        )}

        {entries && entries.length === 0 && !error && (
          <Card>
            <Text style={typography.h2}>Nothing yet</Text>
            <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
              When The Pointe sends a notification, it'll show up here. Pull down to refresh
              anytime.
            </Text>
          </Card>
        )}

        {entries?.map((e) => {
          const hasUrl = typeof e.data?.url === 'string';
          return (
            <Pressable
              key={e.id}
              onPress={() => handleTap(e)}
              disabled={!hasUrl}
              style={({ pressed }) => [pressed && hasUrl ? { opacity: 0.85 } : null]}
            >
              <Card style={{ marginBottom: spacing.md }}>
                <View style={styles.itemTop}>
                  <Text style={[typography.h2, { flex: 1 }]} numberOfLines={2}>
                    {e.title}
                  </Text>
                  <Text style={[typography.small, { color: colors.muted }]}>
                    {relativeTime(e.sentAt)}
                  </Text>
                </View>
                {e.body ? (
                  <Text
                    style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}
                  >
                    {e.body}
                  </Text>
                ) : null}
                {hasUrl ? (
                  <View style={styles.openRow}>
                    <Text style={styles.openLabel}>Open link</Text>
                    <Text style={styles.openChev}>›</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}
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
    back: {
      ...typography.h3,
      color: colors.skyDeep,
      marginBottom: spacing.sm,
    },
    itemTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    openRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.sm,
      borderTopColor: colors.line,
      borderTopWidth: 1,
    },
    openLabel: {
      ...typography.h3,
      color: colors.skyDeep,
      fontSize: 14,
    },
    openChev: {
      fontSize: 20,
      color: colors.skyDeep,
      opacity: 0.6,
    },
    error: {
      backgroundColor: colors.peachSoft,
      borderColor: colors.peach,
      borderWidth: 1,
      borderRadius: radius.md,
      padding: spacing.md,
      marginTop: spacing.md,
    },
  });
}
