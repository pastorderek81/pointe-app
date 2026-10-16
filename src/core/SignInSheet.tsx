import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { Palette, radius, spacing, Typography, useColors, useTypography } from '../theme';

// Shown whenever someone taps "Sign in". Planning Center's login page only
// takes email/phone + PASSWORD and has no "create account" option — but most
// members only ever used Church Center's text-code login (no password), and
// some people aren't in Planning Center at all. So the sheet first asks
// "have an account or new here?" and walks each group down its own path.
const PASSWORD_SETUP_URL = 'https://login.planningcenteronline.com/password_reset/new';
const CONNECT_FORM_URL = 'https://mypointe.churchcenter.com/people/forms/964973';
const HELP_EMAIL =
  'mailto:info@thepointe.online?subject=App%20sign-in%20help&body=I%20can%E2%80%99t%20sign%20in%20to%20The%20Pointe%20app.%20The%20email%20or%20phone%20I%20use%20with%20the%20church%20is%3A%20';

type Mode = 'choose' | 'signup' | 'trouble';

export function SignInSheet({
  visible,
  trouble,
  session,
  onSignIn,
  onOpenLink,
  onClose,
}: {
  visible: boolean;
  // True after a sign-in attempt failed or was cancelled — leads with help.
  trouble: boolean;
  // Bumped each time the sheet is freshly opened, so it starts over at the
  // top. (It is NOT bumped when we return from a help page mid-sign-up.)
  session: number;
  onSignIn: () => void;
  // Opens a help page. The provider hides this sheet first (iOS can't
  // present the in-app browser over a Modal), then brings it back after.
  onOpenLink: (url: string) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);

  const [mode, setMode] = useState<Mode>(trouble ? 'trouble' : 'choose');
  // Sign-up steps they've opened, so we can check them off and point at the next one.
  const [profileDone, setProfileDone] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);

  useEffect(() => {
    setMode(trouble ? 'trouble' : 'choose');
  }, [session, trouble]);

  useEffect(() => {
    setProfileDone(false);
    setPasswordDone(false);
  }, [session]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <SafeAreaView edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.content} bounces={false}>
            <View style={styles.grabber} />

            {mode === 'choose' && (
              <>
                <Text style={styles.title}>Sign in to The Pointe</Text>
                <Text style={styles.body}>
                  The app uses your Planning Center account, the same one behind Church Center.
                </Text>

                <ChoiceCard
                  styles={styles}
                  title="I have an account"
                  body="I’ve used Church Center or given, registered, or joined a group online."
                  cta="Sign in"
                  primary
                  onPress={onSignIn}
                />
                <ChoiceCard
                  styles={styles}
                  title="I don’t have an account"
                  body="New to The Pointe, or never signed up online? Create one in two quick steps."
                  cta="Create an account"
                  onPress={() => setMode('signup')}
                />

                <Pressable onPress={() => setMode('trouble')} hitSlop={8} style={styles.link}>
                  <Text style={styles.linkLabel}>Not sure, or can’t sign in?</Text>
                </Pressable>
              </>
            )}

            {mode === 'signup' && (
              <>
                <BackLink styles={styles} onPress={() => setMode('choose')} />
                <Text style={styles.title}>Create your account</Text>
                <Text style={styles.body}>
                  Takes about two minutes. Use the same email for both steps.
                </Text>

                <Step
                  styles={styles}
                  n={1}
                  title="Create your profile"
                  body="Tell us your name, email, and phone so The Pointe has you on file."
                  cta="Fill out the form"
                  done={profileDone}
                  active={!profileDone}
                  onPress={() => {
                    setProfileDone(true);
                    onOpenLink(CONNECT_FORM_URL);
                  }}
                />
                <Step
                  styles={styles}
                  n={2}
                  title="Set your password"
                  body="Enter that same email. Planning Center will email you a link to choose a password."
                  cta="Set my password"
                  done={passwordDone}
                  active={profileDone && !passwordDone}
                  onPress={() => {
                    setPasswordDone(true);
                    onOpenLink(PASSWORD_SETUP_URL);
                  }}
                />
                <Step
                  styles={styles}
                  n={3}
                  title="Sign in"
                  body="Come back here and sign in with your email and new password."
                  done={false}
                  active={passwordDone}
                />
                <PrimaryButton
                  label="Sign in"
                  variant={passwordDone ? 'peach' : 'ghost'}
                  onPress={onSignIn}
                  style={{ marginTop: spacing.xs }}
                />

                <Pressable onPress={() => setMode('trouble')} hitSlop={8} style={styles.link}>
                  <Text style={styles.linkLabel}>Need help?</Text>
                </Pressable>
              </>
            )}

            {mode === 'trouble' && (
              <>
                {!trouble && <BackLink styles={styles} onPress={() => setMode('choose')} />}
                <Text style={styles.title}>Having trouble signing in?</Text>
                <Text style={styles.body}>
                  The app uses your Planning Center account, the same one behind Church Center.
                </Text>

                <PrimaryButton
                  label={trouble ? 'Try signing in again' : 'Sign in'}
                  variant="peach"
                  onPress={onSignIn}
                  style={{ marginTop: spacing.lg }}
                />

                <Text style={styles.section}>CAN’T SIGN IN?</Text>

                <HelpRow
                  styles={styles}
                  title="I’ve never set a password"
                  body="Most people sign in to Church Center with a text code, which never creates a password. Enter your email, get a link, set a password, then come back and tap Sign in."
                  cta="Set up my password"
                  onPress={() => onOpenLink(PASSWORD_SETUP_URL)}
                />
                <HelpRow
                  styles={styles}
                  title="I don’t have an account"
                  body="Create your profile, set a password, then sign in. We’ll walk you through it."
                  cta="Create an account"
                  onPress={() => setMode('signup')}
                />
                <HelpRow
                  styles={styles}
                  title="Still stuck?"
                  body="Sometimes an old or unsubscribed profile gets in the way. Send us a note and we’ll fix it."
                  cta="Email us"
                  onPress={() => Linking.openURL(HELP_EMAIL)}
                />
              </>
            )}

            <Pressable onPress={onClose} hitSlop={8} style={styles.cancel}>
              <Text style={styles.cancelLabel}>Not now</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ChoiceCard({
  styles,
  title,
  body,
  cta,
  primary,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  body: string;
  cta: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        primary && styles.choicePrimary,
        pressed && { opacity: 0.85 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${cta}`}
    >
      <Text style={[styles.rowTitle, primary && styles.onPeach]}>{title}</Text>
      <Text style={[styles.rowBody, primary && styles.onPeachSoft]}>{body}</Text>
      <Text style={[styles.rowCta, primary && styles.onPeach]}>{cta} ›</Text>
    </Pressable>
  );
}

function Step({
  styles,
  n,
  title,
  body,
  cta,
  done,
  active,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  n: number;
  title: string;
  body: string;
  cta?: string;
  done: boolean;
  active: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.stepRow}>
      <View style={[styles.stepBadge, active && styles.stepBadgeActive, done && styles.stepBadgeDone]}>
        <Text style={[styles.stepBadgeText, (active || done) && styles.onPeach]}>
          {done ? '✓' : n}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
        {cta && <Text style={styles.rowCta}>{done ? `Open again ›` : `${cta} ›`}</Text>}
      </View>
    </View>
  );
  if (!onPress) return <View style={[styles.row, active && styles.rowActive]}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}

function BackLink({ styles, onPress }: { styles: ReturnType<typeof makeStyles>; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={styles.back} accessibilityRole="button">
      <Text style={styles.backLabel}>‹ Back</Text>
    </Pressable>
  );
}

function HelpRow({
  styles,
  title,
  body,
  cta,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  body: string;
  cta: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
      accessibilityRole="button"
    >
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowBody}>{body}</Text>
      <Text style={styles.rowCta}>{cta} ›</Text>
    </Pressable>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: colors.paper,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      maxHeight: '88%',
    },
    content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    grabber: {
      alignSelf: 'center',
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.line,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    title: { ...typography.h3, fontSize: 22, lineHeight: 28, color: colors.ink },
    body: { ...typography.body, color: colors.textMid, marginTop: spacing.xs, marginBottom: spacing.md },
    section: {
      ...typography.label,
      color: colors.muted,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    choice: {
      backgroundColor: colors.white,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    choicePrimary: { backgroundColor: colors.peachDeep, borderColor: colors.peachDeep },
    onPeach: { color: colors.white },
    onPeachSoft: { color: colors.white, opacity: 0.9 },
    row: {
      backgroundColor: colors.white,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rowActive: { borderColor: colors.peachDeep, borderWidth: 2 },
    rowTitle: { ...typography.h3, fontSize: 16, color: colors.ink },
    rowBody: { ...typography.small, color: colors.textMid, marginTop: spacing.xs },
    rowCta: {
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      color: colors.peachDeep,
      marginTop: spacing.sm,
    },
    stepRow: { flexDirection: 'row', gap: spacing.md },
    stepBadge: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBadgeActive: { backgroundColor: colors.peachDeep, borderColor: colors.peachDeep },
    stepBadgeDone: { backgroundColor: colors.skyDeep, borderColor: colors.skyDeep },
    stepBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.muted },
    link: { alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.sm },
    linkLabel: { fontFamily: 'Inter_700Bold', fontSize: 14, color: colors.skyDeep },
    back: { alignSelf: 'flex-start', paddingVertical: spacing.xs, marginBottom: spacing.xs },
    backLabel: { fontFamily: 'Inter_700Bold', fontSize: 15, color: colors.skyDeep },
    cancel: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
    cancelLabel: { ...typography.h3, fontSize: 15, color: colors.muted },
  });
}
