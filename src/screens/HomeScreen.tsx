import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Hero } from '../components/Hero';
import { ActionChipRow, Chip } from '../components/ActionChipRow';
import { SectionHeader } from '../components/SectionHeader';
import { MessageCard } from '../components/MessageCard';
import { FeaturedRow } from '../components/FeaturedRow';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { featuredEvents } from '../featured';
import { colors, radius, shadow, spacing, typography } from '../theme';
import { config, isPlaceholder } from '../config';
import { useAuth } from '../AuthContext';
import { fetchPlaylistVideos, YouTubeVideo, youtubeWatchUrl } from '../youtube';
import { isServiceLive, nextServiceLabel } from '../utils/services';
import { SERIES_EYEBROW, useCurrentSeries } from '../series';

const SERIES_ART = require('../../assets/series-current.jpg');
const FALLBACK_SERMON = require('../../assets/photo-stage.jpg');

export function HomeScreen({ navigation }: any) {
  const { signedIn, signIn, configured } = useAuth();
  const [latest, setLatest] = useState<YouTubeVideo | null>(null);
  const [live, setLive] = useState(isServiceLive());
  const { series } = useCurrentSeries();

  useEffect(() => {
    const t = setInterval(() => setLive(isServiceLive()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Pull from the current sermon series playlist instead of all channel
  // uploads — the playlist contains only sermon clips, never worship reels
  // or livestream archives. The most recent item there is last Sunday's
  // message.
  useEffect(() => {
    if (isPlaceholder(config.youtubeApiKey)) return;
    if (!series.id || series.id === 'fallback') return;
    fetchPlaylistVideos(series.id, 1)
      .then((vids) => setLatest(vids[0] ?? null))
      .catch(() => {});
  }, [series.id]);

  const chips: Chip[] = [
    {
      key: 'give',
      label: 'Give',
      glyph: '♡',
      tone: 'peach',
      onPress: () => Linking.openURL(config.pushpayUrl),
    },
    {
      key: 'visit',
      label: 'Plan a Visit',
      glyph: '◎',
      tone: 'sky',
      onPress: () => Linking.openURL('https://www.thepointe.online/planyourvisit/'),
    },
    {
      key: 'prayer',
      label: 'Prayer',
      glyph: '✻',
      onPress: () => Linking.openURL('https://www.thepointe.online/prayer/'),
    },
    {
      key: 'connect',
      label: 'Connect',
      glyph: '✋',
      onPress: () => Linking.openURL('https://www.thepointe.online/aboutus/'),
    },
    {
      key: 'events',
      label: 'Events',
      glyph: '◇',
      onPress: () => navigation.navigate('Events'),
    },
  ];

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Image always uses the bundled series-current.jpg (Derek's designed
          16:9 art). YouTube's playlist endpoint returns the first video's
          frame by default, which looks generic. Once a custom playlist
          thumbnail is uploaded in YouTube Studio, switch back to:
            source={series.imageUrl ? { uri: series.imageUrl } : SERIES_ART}
       */}
      <Hero
        source={SERIES_ART}
        eyebrow={SERIES_EYEBROW}
        title={series.title}
        subtitle={
          live
            ? `We're live right now — join us · ${series.subtitle}`
            : `${series.subtitle} · Next gathering ${nextServiceLabel()}`
        }
        isLive={live}
        rightSlot={
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={({ pressed }) => [styles.gearBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.gearGlyph}>⚙</Text>
          </Pressable>
        }
      />

      <ActionChipRow chips={chips} />

      {featuredEvents.length > 0 && (
        <>
          <SectionHeader eyebrow="FEATURED" title="What's coming up" />
          <FeaturedRow events={featuredEvents} />
        </>
      )}

      <SectionHeader
        eyebrow="LAST SUNDAY"
        title="Last week's message"
        actionLabel="See all →"
        onActionPress={() => navigation.navigate('Media')}
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <MessageCard
          thumbnailUrl={latest?.thumbnailUrl ?? null}
          fallbackSource={FALLBACK_SERMON}
          title={latest?.title ?? 'Catch up on the latest from The Pointe'}
          meta={
            latest?.publishedAt
              ? new Date(latest.publishedAt).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Tap to open the message library'
          }
          onPress={() =>
            latest
              ? Linking.openURL(youtubeWatchUrl(latest.id))
              : navigation.navigate('Media')
          }
        />
        {/* Notes URL: prefer the YouTube video description (auto-per-sermon),
            fall back to the configured URL in app.json (manual update). */}
        {(() => {
          const notesUrl = latest?.bibleUrl ?? config.youversionUrl;
          if (!notesUrl) return null;
          return (
            <Pressable
              onPress={() => Linking.openURL(notesUrl)}
              style={({ pressed }) => [styles.notesBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.notesGlyph}>✜</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notesTitle}>Sermon Notes</Text>
                <Text style={styles.notesSub}>Open in YouVersion Bible app</Text>
              </View>
              <Text style={styles.notesChev}>›</Text>
            </Pressable>
          );
        })()}
      </View>

      {!signedIn && (
        <>
          <SectionHeader eyebrow="MEMBERS" title="Sign in to go deeper" />
          <View style={{ paddingHorizontal: spacing.lg }}>
            <View style={[styles.signInCard, shadow.card]}>
              <Text style={styles.signInTitle}>Your groups, events & more</Text>
              <Text style={styles.signInBody}>
                Use your Planning Center account — same one you use for Church Center. We'll
                surface your groups, events you've RSVP'd to, and serving schedules.
              </Text>
              <PrimaryButton
                label={configured ? 'Sign in with Planning Center' : 'Sign-in not yet configured'}
                onPress={signIn}
                style={{ marginTop: spacing.md }}
              />
            </View>
          </View>
        </>
      )}

      <SectionHeader
        eyebrow="GIVE"
        title="Partner with what God's doing"
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <View style={[styles.giveCard, shadow.card]}>
          <Text style={styles.giveTitle}>Generosity changes everything</Text>
          <Text style={styles.giveBody}>
            Secure giving through Pushpay — once or recurring. Takes 60 seconds the first time,
            10 seconds after that.
          </Text>
          <PrimaryButton
            label="Give Now"
            variant="peach"
            onPress={() => Linking.openURL(config.pushpayUrl)}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </View>

      <SectionHeader
        eyebrow="FIRST TIME?"
        title="We'd love to meet you"
      />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <Card>
          <Text style={typography.h2}>About parking</Text>
          <Text style={[typography.body, { color: colors.textMid, marginTop: spacing.sm }]}>
            Parking in Cocoa Beach is a real challenge — but we have enough spots and the best
            parking team you'll ever meet, ready to help you find a spot and walk you in.
          </Text>
          <PrimaryButton
            label="Plan Your Visit"
            variant="ghost"
            onPress={() => Linking.openURL('https://www.thepointe.online/planyourvisit/')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  gearBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  gearGlyph: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.95)',
  },
  notesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.skyBg,
    borderColor: colors.skySoft,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  notesGlyph: {
    fontSize: 22,
    color: colors.skyDeep,
    width: 28,
    textAlign: 'center',
  },
  notesTitle: { ...typography.h3, color: colors.skyDeep },
  notesSub: { ...typography.small, color: colors.textMid, marginTop: 2 },
  notesChev: {
    fontSize: 22,
    color: colors.skyDeep,
    opacity: 0.6,
  },
  signInCard: {
    backgroundColor: colors.inkDeep,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  signInTitle: { ...typography.h1, color: colors.white },
  signInBody: {
    ...typography.body,
    color: colors.inkMuted,
    marginTop: spacing.sm,
  },
  giveCard: {
    backgroundColor: colors.peachSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.peach,
  },
  giveTitle: { ...typography.h1, color: colors.peachInk },
  giveBody: {
    ...typography.body,
    color: colors.peachInk,
    opacity: 0.85,
    marginTop: spacing.sm,
  },
});
