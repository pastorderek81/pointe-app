// Soft permission prompt for push notifications. Most users won't tap into
// Settings to flip the toggle, so we prompt once on a fresh install — but
// only after they're already in the app, with context for what they'd
// receive. Apple's HIG specifically recommends this pattern over a
// cold-start permission dialog.
//
// Shows when iOS hasn't been asked yet AND the user hasn't tapped "Not now"
// previously. Dismissal is sticky (SecureStore key, versioned).
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getPushPermissionStatus, requestAndRegisterPush } from '../../core/push';
import { spacing, useColors, useTypography } from '../../theme';

const DISMISSED_KEY = 'push_soft_prompt_dismissed_v1';

export function PushPromptCard() {
  const colors = useColors();
  const typography = useTypography();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const dismissed = await SecureStore.getItemAsync(DISMISSED_KEY);
      if (dismissed) return;
      const status = await getPushPermissionStatus();
      if (status === 'undetermined' && active) setShow(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const onYes = async () => {
    setShow(false);
    await requestAndRegisterPush();
  };

  const onNotNow = async () => {
    setShow(false);
    await SecureStore.setItemAsync(DISMISSED_KEY, '1');
  };

  if (!show) return null;

  return (
    <View style={styles.wrap}>
      <Card>
        <Text style={typography.label}>STAY IN THE LOOP</Text>
        <Text style={[typography.h2, { marginTop: spacing.xs }]}>Heads-up before Sunday?</Text>
        <Text style={[typography.body, { marginTop: spacing.sm, color: colors.textMid }]}>
          A friendly reminder Saturday evening with the upcoming sermon notes link, plus the occasional event announcement. We'll never spam you.
        </Text>
        <View style={styles.btnRow}>
          <PrimaryButton label="Not now" variant="ghost" onPress={onNotNow} style={styles.btn} />
          <PrimaryButton label="Yes, notify me" onPress={onYes} style={styles.btn} />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.lg,
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  btn: { flex: 1 },
});
