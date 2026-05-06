import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Card } from '../components/Card';
import { GuestBanner } from '../components/GuestBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../AuthContext';
import { fetchGroups, PcoGroup } from '../pco/api';
import { config, isPlaceholder } from '../config';
import { colors, radius, shadow, spacing, typography } from '../theme';

// Tapping a group opens its Church Center page in an in-app browser
// (SFSafariViewController on iOS, Chrome Custom Tabs on Android). Cookies
// are shared with Safari, so signed-in members land already logged in
// and can use Church Center's built-in messaging. Phase 2 replaces this
// with native in-app messaging.
async function openGroup(g: PcoGroup) {
  await WebBrowser.openBrowserAsync(g.churchCenterUrl, {
    dismissButtonStyle: 'close',
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    controlsColor: colors.skyDeep,
    toolbarColor: colors.paper,
  });
}

export function GroupsScreen() {
  const { signedIn, signIn, configured } = useAuth();
  const [groups, setGroups] = useState<PcoGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const guestProxyMissing = !signedIn && isPlaceholder(config.proxyUrl);

  const load = useCallback(async () => {
    setError(null);
    try {
      setGroups(await fetchGroups());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load groups');
    }
  }, []);

  useEffect(() => {
    if (!guestProxyMissing) load();
  }, [guestProxyMissing, signedIn, load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (guestProxyMissing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={typography.label}>GROUPS</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>Find your people</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={[styles.gateCard, shadow.card]}>
            <Text style={[typography.h1, { color: colors.white }]}>Real life happens in groups</Text>
            <Text style={[typography.body, { color: colors.inkMuted, marginTop: spacing.sm }]}>
              Sign in with your Planning Center account to see groups at The Pointe.
            </Text>
            <PrimaryButton
              label={configured ? 'Sign in with Planning Center' : 'Sign-in not yet configured'}
              onPress={signIn}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <Text style={typography.label}>GROUPS</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>Find your people</Text>
        </View>

        {!signedIn && <GuestBanner onSignIn={signIn} configured={configured} />}

        {error && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>{error}</Text>
            </View>
          </View>
        )}

        {groups === null && !error && (
          <ActivityIndicator color={colors.skyDeep} style={{ marginTop: spacing.xl }} />
        )}

        {groups && groups.length === 0 && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text style={[typography.body, { color: colors.muted }]}>No groups available yet.</Text>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {groups?.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => openGroup(g)}
              style={({ pressed }) => [
                pressed && { opacity: 0.92 },
              ]}
            >
              <Card style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
                {g.imageUrl ? (
                  <Image source={{ uri: g.imageUrl }} style={styles.thumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={[typography.label, { color: colors.skyDeep }]}>GROUP</Text>
                  </View>
                )}
                <View style={{ padding: spacing.md }}>
                  <View style={styles.titleRow}>
                    <Text style={[typography.h2, { flex: 1 }]} numberOfLines={2}>
                      {g.name}
                    </Text>
                    {g.chatEnabled ? (
                      <View style={styles.chatPill}>
                        <Text style={styles.chatPillText}>CHAT</Text>
                      </View>
                    ) : null}
                  </View>
                  {g.scheduleText ? (
                    <Text style={[typography.small, { marginTop: spacing.xs }]}>
                      {g.scheduleText}
                    </Text>
                  ) : null}
                  {g.description ? (
                    <Text
                      style={[typography.body, { color: colors.textMid, marginTop: spacing.xs }]}
                      numberOfLines={3}
                    >
                      {g.description}
                    </Text>
                  ) : null}
                  <View style={styles.openRow}>
                    <Text style={styles.openLabel}>
                      {signedIn ? 'Open & message' : 'Open in Church Center'}
                    </Text>
                    <Text style={styles.openChev}>›</Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
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
  gateCard: {
    backgroundColor: colors.inkDeep,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  thumb: {
    width: '100%',
    height: 160,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyBg,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  chatPill: {
    backgroundColor: colors.skyBg,
    borderColor: colors.skySoft,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chatPillText: {
    ...typography.label,
    color: colors.skyDeep,
    fontSize: 10,
    letterSpacing: 1.2,
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
    marginTop: spacing.sm,
  },
});
