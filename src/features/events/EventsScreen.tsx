import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Card } from '../../components/Card';
import { GuestBanner } from '../../components/GuestBanner';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../core/AuthContext';
import { fetchSignups, PcoSignup } from '../../core/pco/api';
import { config, isPlaceholder } from '../../config';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';
import { useRemoteContent } from '../home/content';
import { PageHero } from '../home/PageHero';

export function EventsScreen() {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { signedIn, signIn, signOut, configured } = useAuth();
  const [signups, setSignups] = useState<PcoSignup[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authExpired, setAuthExpired] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { content } = useRemoteContent();

  const openInBrowser = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      dismissButtonStyle: 'close',
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.skyDeep,
      toolbarColor: colors.paper,
    });
  };

  const guestProxyMissing = !signedIn && isPlaceholder(config.proxyUrl);

  const load = useCallback(async () => {
    setError(null);
    setAuthExpired(false);
    try {
      setSignups(await fetchSignups());
    } catch (e: any) {
      if (e?.name === 'AuthExpiredError') {
        setAuthExpired(true);
      } else {
        setError(e?.message ?? 'Failed to load events');
      }
    }
  }, []);

  const handleReSignIn = async () => {
    await signOut();
    await signIn();
  };

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
          <Text style={typography.display}>What's happening</Text>
        </View>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <View style={[styles.gateCard, shadow.card]}>
            <Text style={[typography.h1, { color: '#ffffff' }]}>Sign in to see events</Text>
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
          <Text style={typography.display}>What's happening</Text>
        </View>

        <PageHero hero={content.eventsHero} />

        {!signedIn && <GuestBanner onSignIn={signIn} configured={configured} />}

        {authExpired && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>
                Your session expired. Sign in again to see events.
              </Text>
              <PrimaryButton
                label="Sign in again"
                onPress={handleReSignIn}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </View>
        )}

        {error && (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={styles.error}>
              <Text style={[typography.body, { color: colors.peachInk }]}>{error}</Text>
            </View>
          </View>
        )}

        {signups === null && !error && !authExpired && (
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
                {s.registrationUrl || s.infoUrl ? (
                  <View style={styles.actionRow}>
                    {s.infoUrl ? (
                      <Pressable
                        onPress={() => openInBrowser(s.infoUrl!)}
                        style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.85 }]}
                      >
                        <Text style={styles.infoLabel}>More Info</Text>
                      </Pressable>
                    ) : null}
                    {s.registrationUrl ? (
                      <Pressable
                        onPress={() => openInBrowser(s.registrationUrl!)}
                        style={({ pressed }) => [styles.signUpBtn, pressed && { opacity: 0.85 }]}
                      >
                        <Text style={styles.signUpLabel}>Sign Up</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </Card>
          ))}
        </View>
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
    actionRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    infoBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.white,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
    },
    infoLabel: {
      ...typography.h3,
      color: colors.skyDeep,
      fontSize: 15,
    },
    signUpBtn: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.skyDeep,
      borderRadius: radius.pill,
      paddingVertical: spacing.md - 2,
      paddingHorizontal: spacing.lg,
    },
    signUpLabel: {
      ...typography.h3,
      color: '#ffffff',
      fontSize: 15,
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
