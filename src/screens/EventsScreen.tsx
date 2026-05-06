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
import { Card } from '../components/Card';
import { GuestBanner } from '../components/GuestBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../AuthContext';
import { fetchSignups, PcoSignup } from '../pco/api';
import { config, isPlaceholder } from '../config';
import { colors, radius, shadow, spacing, typography } from '../theme';

export function EventsScreen() {
  const { signedIn, signIn, configured } = useAuth();
  const [signups, setSignups] = useState<PcoSignup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const guestProxyMissing = !signedIn && isPlaceholder(config.proxyUrl);

  const load = useCallback(async () => {
    setError(null);
    try {
      setSignups(await fetchSignups());
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load events');
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
          <Text style={typography.label}>EVENTS</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>What's happening</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={[styles.gateCard, shadow.card]}>
            <Text style={[typography.h1, { color: colors.white }]}>Sign in to see events</Text>
            <Text style={[typography.body, { color: colors.inkMuted, marginTop: spacing.sm }]}>
              We pull events directly from Planning Center so they're always up to date.
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
          <Text style={typography.label}>EVENTS</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>What's happening</Text>
          <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
            Sign up for what's coming up at The Pointe.
          </Text>
        </View>

        {!signedIn && <GuestBanner onSignIn={signIn} configured={configured} />}

        {error && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>{error}</Text>
            </View>
          </View>
        )}

        {signups === null && !error && (
          <ActivityIndicator color={colors.skyDeep} style={{ marginTop: spacing.xl }} />
        )}

        {signups && signups.length === 0 && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text style={[typography.body, { color: colors.muted }]}>
              Nothing open right now. Check back soon.
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {signups?.map((s) => (
            <Card key={s.id} style={{ marginBottom: 0, padding: 0, overflow: 'hidden' }}>
              {s.logoUrl ? (
                <Image source={{ uri: s.logoUrl }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={[typography.label, { color: colors.skyDeep }]}>EVENT</Text>
                </View>
              )}
              <View style={{ padding: spacing.md }}>
                <Text style={typography.h2} numberOfLines={2}>
                  {s.name}
                </Text>
                {s.description ? (
                  <Text
                    style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}
                    numberOfLines={3}
                  >
                    {s.description}
                  </Text>
                ) : null}
                {s.registrationUrl ? (
                  <Pressable
                    onPress={() => Linking.openURL(s.registrationUrl!)}
                    style={({ pressed }) => [styles.signUpBtn, pressed && { opacity: 0.85 }]}
                  >
                    <Text style={styles.signUpLabel}>Sign Up</Text>
                    <Text style={styles.signUpChev}>›</Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
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
    aspectRatio: 16 / 9,
    backgroundColor: colors.surface,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyBg,
  },
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyDeep,
    borderRadius: radius.pill,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: 6,
  },
  signUpLabel: {
    ...typography.h3,
    color: colors.white,
    fontSize: 15,
  },
  signUpChev: {
    fontSize: 18,
    color: colors.white,
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
