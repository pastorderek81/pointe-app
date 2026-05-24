import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageSourcePropType, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Hero } from './Hero';
import { ActionChipRow, Chip } from './ActionChipRow';
import { SectionHeader } from '../../components/SectionHeader';
import { MessageCard } from '../media/MessageCard';
import { FeaturedCard, FeaturedRow } from './FeaturedRow';
import { Card } from '../../components/Card';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PushPromptCard } from './PushPromptCard';
import { useRemoteContent } from './content';
import { Palette, radius, shadow, spacing, Typography, useColors, useTypography } from '../../theme';
import { config, isPlaceholder } from '../../config';
import { useAuth } from '../../core/AuthContext';
import { fetchPlaylistVideos, YouTubeVideo, youtubeWatchUrl } from '../media/youtube';
import { useSavedSermons } from '../media/savedSermons';
import { isServiceLive, nextServiceLabel } from '../../utils/services';
import { SERIES_EYEBROW, useCurrentSeries } from './series';
import { WatchLiveBanner } from './WatchLiveBanner';

const SERIES_ART = require('../../../assets/series-current.jpg');
const MOTHERS_DAY_ART = require('../../../assets/mothers-day-2026.jpg');
const FALLBACK_SERMON = require('../../../assets/photo-stage.jpg');
const FALLBACK_FEATURED = require('../../../assets/photo-kids.jpg');

const CONNECT_URL = 'https://mypointe.churchcenter.com/people/forms/964973';

// Hero campaign override — Mother's Day Sunday, May 10, 2026.
// Auto-reverts to the Faith in Action series art early Mon May 11.
const MOTHERS_DAY_END = new Date('2026-05-11T08:00:00Z'); // ~4am ET Monday
const SHOW_MOTHERS_DAY = Date.now() < MOTHERS_DAY_END.getTime();

export function HomeScreen({ navigation }: any) {
  const colors = useColors();
  const typography = useTypography();
  const styles = useMemo(() => makeStyles(colors, typography), [colors, typography]);
  const { signedIn, signIn, configured } = useAuth();
  const [latest, setLatest] = useState<YouTubeVideo | null>(null);
  const [live, setLive] = useState(isServiceLive());
  const [refreshing, setRefreshing] = useState(false);
  const { series, refresh: refreshSeries } = useCurrentSeries();
  const { content, refresh: refreshContent } = useRemoteContent();
  const { isSaved, toggle: toggleSaved } = useSavedSermons();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const fetchSermon = async () => {
      if (isPlaceholder(config.youtubeApiKey)) return;
      if (!series.id || series.id === 'fallback') return;
      try {
        const vids = await fetchPlaylistVideos(series.id, 1);
        setLatest(vids[0] ?? null);
      } catch {
        // ignore — keep prior value
      }
    };
    await Promise.all([refreshContent(), refreshSeries(), fetchSermon()]);
    setLive(isServiceLive());
    setRefreshing(false);
  }, [refreshContent, refreshSeries, series.id]);

  useEffect(() => {
    const t = setInterval(() => setLive(isServiceLive()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isPlaceholder(config.youtubeApiKey)) return;
    if (!series.id || series.id === 'fallback') return;
    fetchPlaylistVideos(series.id, 1)
      .then((vids) => setLatest(vids[0] ?? null))
      .catch(() => {});
  }, [series.id]);

  const chips: Chip[] = [
    {
      key: 'sermon-notes',
      label: 'Sermon Notes',
      glyph: '✎',
      tone: 'sky',
      onPress: () => Linking.openURL(content.sermonNotesUrl),
    },
    {
      key: 'connect',
      label: 'Connect',
      glyph: '✋',
      onPress: () => Linking.openURL(CONNECT_URL),
    },
    {
      key: 'prayer',
      label: 'Prayer',
      glyph: '✻',
      onPress: () => Linking.openURL('https://www.thepointe.online/prayer/'),
    },
    {
      key: 'visit',
      label: 'Plan a Visit',
      glyph: '◎',
      onPress: () => Linking.openURL('https://www.thepointe.online/planyourvisit/'),
    },
    {
      key: 'events',
      label: 'Events',
      glyph: '◇',
      onPress: () => navigation.navigate('Events'),
    },
    {
      key: 'give',
      label: 'Give',
      glyph: '♡',
      tone: 'peach',
      onPress: () => Linking.openURL(config.pushpayUrl),
    },
  ];

  const featuredCards: FeaturedCard[] = useMemo(
    () =>
      content.featured.map((f) => ({
        id: f.id,
        title: f.title,
        dateLabel: f.dateLabel,
        url: f.url,
        image: f.imageUrl ? { uri: f.imageUrl } : FALLBACK_FEATURED,
      })),
    [content.featured],
  );

  const heroImages = useMemo<ImageSourcePropType[]>(() => {
    if (content.header.images && content.header.images.length > 0) {
      return content.header.images.map((url) => ({ uri: url }));
    }
    if (content.header.imageUrl) {
      return [{ uri: content.header.imageUrl }];
    }
    if (SHOW_MOTHERS_DAY) return [MOTHERS_DAY_ART];
    return [SERIES_ART];
  }, [content.header.images, content.header.imageUrl]);

  const heroEyebrow =
    content.header.eyebrow ??
    (SHOW_MOTHERS_DAY ? 'THIS SUNDAY · MAY 10' : SERIES_EYEBROW);

  const heroTitle =
    content.header.title ??
    (SHOW_MOTHERS_DAY ? 'Bring the moms' : series.title);

  const heroSubtitle =
    content.header.subtitle ??
    (SHOW_MOTHERS_DAY
      ? live
        ? "We're live right now — join us · All four services"
        : `Mother's Day · All four services · Next gathering ${nextServiceLabel()}`
      : live
      ? `We're live right now — join us · ${series.subtitle}`
      : `${series.subtitle} · Next gathering ${nextServiceLabel()}`);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.paper }} edges={['top']}>
    {live ? <WatchLiveBanner /> : null}
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Hero
        images={heroImages}
        eyebrow={heroEyebrow}
        title={heroTitle}
        subtitle={heroSubtitle}
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

      <PushPromptCard />

      {featuredCards.length > 0 && (
        <>
          <SectionHeader eyebrow="FEATURED" title="What's coming up" />
          <FeaturedRow events={featuredCards} />
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
          fallbackSource={SERIES_ART}
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
          saved={latest ? isSaved(latest.id) : false}
          onToggleSave={
            latest
              ? () =>
                  toggleSaved({
                    id: latest.id,
                    title: latest.title,
                    thumbnailUrl: latest.thumbnailUrl,
                    publishedAt: latest.publishedAt,
                  })
              : undefined
          }
        />
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
    </SafeAreaView>
  );
}

function makeStyles(colors: Palette, typography: Typography) {
  return StyleSheet.create({
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
    // signInTitle is on dark inkDeep card — always white regardless of theme.
    signInTitle: { ...typography.h1, color: '#ffffff' },
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
}
