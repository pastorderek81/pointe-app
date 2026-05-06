// Settings sits behind a gear icon on Home. Holds account + notification
// prefs + church info — the kind of stuff users only need occasionally.
import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../AuthContext';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { registerForPushNotifications } from '../push';

export function SettingsScreen({ navigation }: any) {
  const { signedIn, signIn, signOut, configured } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (pushEnabled && !pushToken) {
      registerForPushNotifications().then((t) => {
        if (t) setPushToken(t);
        else setPushEnabled(false);
      });
    }
  }, [pushEnabled, pushToken]);

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
            <Text style={[typography.h2, { color: colors.white, marginTop: spacing.xs }]}>
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
                onValueChange={setPushEnabled}
                trackColor={{ true: colors.sky, false: colors.line }}
                thumbColor={colors.white}
              />
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

const styles = StyleSheet.create({
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
});
