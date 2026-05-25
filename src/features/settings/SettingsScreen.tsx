// Settings sits behind a gear icon on Home. Holds account + notification
// prefs + church info — the kind of stuff users only need occasionally.
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../core/AuthContext';
import { Palette, radius, shadow, spacing, Typography, useColors, useThemePreference, useTypography } from '../../theme';
import { getPushPermissionStatus, requestAndRegisterPush } from '../../core/push';

export function SettingsScreen({ navigation }: any) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const [preference, setPreference] = useThemePreference();
  const { signedIn, signIn, signOut, configured } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reflect the actual iOS/Android permission state in the toggle on mount —
  // otherwise the toggle would show "off" even for users who already opted
  // in on a previous launch.
  useEffect(() => {
    getPushPermissionStatus().then((s) => setPushEnabled(s === 'granted'));
  }, []);

  const onTogglePush = async (next: boolean) => {
    if (busy) return;
    if (!next) {
      // The OS owns revocation; we can't undo a granted permission from the
      // app. Send the user to system settings instead.
      Linking.openSettings();
      return;
    }
    setBusy(true);
    const token = await requestAndRegisterPush();
    setPushEnabled(!!token);
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
          <Text style={typography.label}>SETTINGS</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>Account</Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <View style={[styles.accountCard, shadow.card]}>
            <Text style={[typography.label, { color: colors.peach }]}>ACCOUNT</Text>
            <Text style={[typography.h2, { color: '#ffffff', marginTop: spacing.xs }]}>
              {signedIn ? 'Signed in' : 'Not signed in'}
            </Text>
            <Text style={[typography.body, { color: colors.inkMuted, marginTop: spacing.xs }]}>
              {signedIn
                ? 'Connected to your Planning Center account.'
                : 'Sign in with your Planning Center account to unlock groups, events, and more.'}
            </Text>
            <PrimaryButton
              label={signedIn ? 'Sign out' : configured ? 'Sign in' : 'Sign-in not yet configured'}
              variant={signedIn ? 'ghost' : 'peach'}
              onPress={signedIn ? signOut : signIn}
              style={{ marginTop: spacing.md }}
            />
          </View>

          <Card style={{ marginBottom: 0 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={typography.label}>NOTIFICATIONS</Text>
                <Text style={[typography.h2, { marginTop: spacing.xs }]}>Push notifications</Text>
                <Text style={[typography.small, { marginTop: spacing.xs }]}>
                  Sermon reminders, event nudges, prayer requests.
                </Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={onTogglePush}
                disabled={busy}
                trackColor={{ true: colors.sky, false: colors.line }}
                thumbColor={colors.white}
              />
            </View>
          </Card>

          <Card style={{ marginBottom: 0 }}>
            <Text style={typography.label}>APPEARANCE</Text>
            <Text style={[typography.h2, { marginTop: spacing.xs }]}>Theme</Text>
            <Text style={[typography.small, { marginTop: spacing.xs }]}>
              Auto follows your phone's system setting. Light or Dark stays fixed.
            </Text>
            <View style={styles.themeRow}>
              {(['auto', 'light', 'dark'] as const).map((p) => {
                const active = preference === p;
                const label = p === 'auto' ? 'Auto' : p === 'light' ? 'Light' : 'Dark';
                return (
                  <Pressable
                    key={p}
                    onPress={() => setPreference(p)}
                    style={({ pressed }) => [
                      styles.themePill,
                      active && styles.themePillActive,
                      pressed && { opacity: 0.85 },
                    ]}
                  >
                    <Text style={[styles.themePillLabel, active && styles.themePillLabelActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          <Card style={{ marginBottom: 0 }}>
            <Text style={typography.label}>VISIT</Text>
            <Text style={[typography.h2, { marginTop: spacing.xs }]}>Service times</Text>
            <Text style={[typography.body, { marginTop: spacing.xs, color: colors.textMid }]}>
              Saturday 5:00 PM{'\n'}Sunday 8:00, 9:30, 11:00 AM
            </Text>
            <PrimaryButton
              label="Plan Your Visit"
              variant="ghost"
              onPress={() => Linking.openURL('https://www.thepointe.online/planyourvisit/')}
              style={{ marginTop: spacing.md }}
            />
          </Card>

          <Card style={{ marginBottom: 0 }}>
            <Text style={typography.label}>WEBSITE</Text>
            <Text style={[typography.h2, { marginTop: spacing.xs }]}>thepointe.online</Text>
            <PrimaryButton
              label="Open in browser"
              variant="ghost"
              onPress={() => Linking.openURL('https://www.thepointe.online/')}
              style={{ marginTop: spacing.md }}
            />
          </Card>

        </View>

        <Text style={[typography.small, { textAlign: 'center', marginTop: spacing.xl }]}>
          The Pointe Church · Cocoa Beach, FL
        </Text>
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
    close: {
      ...typography.h3,
      color: colors.skyDeep,
      alignSelf: 'flex-end',
      marginBottom: spacing.sm,
    },
    accountCard: {
      backgroundColor: colors.inkDeep,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    themeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    themePill: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    themePillActive: {
      backgroundColor: colors.skyDeep,
      borderColor: colors.skyDeep,
    },
    themePillLabel: {
      ...typography.h3,
      color: colors.textMid,
      fontSize: 14,
    },
    themePillLabelActive: {
      color: '#ffffff',
    },
  });
}
