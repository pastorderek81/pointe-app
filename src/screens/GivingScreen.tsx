import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { config } from '../config';

export function GivingScreen() {
  const open = () => Linking.openURL(config.pushpayUrl);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={styles.header}>
          <Text style={typography.label}>GIVE</Text>
          <Text style={[typography.display, { marginTop: spacing.xs }]}>Generosity</Text>
          <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
            Partner with what God is doing in Cocoa Beach.
          </Text>
        </View>

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <View style={[styles.heroCard, shadow.card]}>
            <Text style={[typography.label, { color: colors.peach }]}>SECURE GIVING</Text>
            <Text style={[styles.heroTitle, { marginTop: spacing.sm }]}>
              Generosity changes everything.
            </Text>
            <Text style={styles.heroBody}>
              Your gift fuels weekend services, kids ministry, missions, and the daily work of
              caring for our community.
            </Text>
            <PrimaryButton
              label="Give Now"
              variant="peach"
              onPress={open}
              style={{ marginTop: spacing.lg }}
            />
            <Text style={styles.poweredBy}>
              Powered by Pushpay — secure & encrypted
            </Text>
          </View>

          <Card style={{ marginBottom: 0 }}>
            <Text style={typography.label}>WAYS TO GIVE</Text>
            <Text style={[typography.h2, { marginTop: spacing.xs }]}>One-time or recurring</Text>
            <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
              Give a single gift, or set up recurring giving — weekly, monthly, or aligned with
              your paycheck. Bank transfer or card. Takes 60 seconds the first time, 10 seconds
              after that.
            </Text>
          </Card>

          <Card style={{ marginBottom: 0 }}>
            <Text style={typography.label}>OTHER WAYS</Text>
            <Text style={[typography.h2, { marginTop: spacing.xs }]}>Text, in-person, mail</Text>
            <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
              Text <Text style={{ fontFamily: typography.h3.fontFamily, color: colors.ink }}>POINTE</Text> to{' '}
              <Text style={{ fontFamily: typography.h3.fontFamily, color: colors.ink }}>77977</Text>
              {' '}for quick mobile giving, drop a check in the box on Sunday, or mail to The Pointe
              Church, Cocoa Beach FL.
            </Text>
          </Card>

          <Text style={[typography.small, { textAlign: 'center', marginTop: spacing.md }]}>
            "Each of you should give what you have decided in your heart to give, not reluctantly
            or under compulsion, for God loves a cheerful giver." — 2 Corinthians 9:7
          </Text>
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
  heroCard: {
    backgroundColor: colors.peachSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.peach,
  },
  heroTitle: {
    ...typography.h1,
    color: colors.peachInk,
    fontSize: 28,
    lineHeight: 33,
  },
  heroBody: {
    ...typography.body,
    color: colors.peachInk,
    opacity: 0.85,
    marginTop: spacing.sm,
  },
  poweredBy: {
    ...typography.small,
    color: colors.peachInk,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
