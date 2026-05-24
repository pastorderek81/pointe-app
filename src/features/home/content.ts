// Remote-driven home screen content.
//
// Featured cards, the sermon-notes URL, and the optional hero override come
// from `featured.json` in the public `pointe-content` GitHub repo, fronted
// by our Cloudflare Worker at `${proxyUrl}/content` (60s cache, with shape
// validation so a typo in the JSON doesn't break the app).
//
// Edit weekly content there — no app rebuild needed.
//
// On cold start the bundled DEFAULT_CONTENT renders immediately so users
// never see a loading state; a background fetch then swaps in the latest.
// The fetch retries on app foreground, so users coming back to the app
// after the JSON changed pick it up within ~1s.
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { config } from '../../config';

export type FeaturedItem = {
  id: string;
  title: string;
  dateLabel: string;
  description: string;
  imageUrl: string | null; // null => bundled fallback
  url: string;
};

export type HeroContent = {
  // Single hero image (legacy / single-image case). Kept for backwards
  // compat when older JSON files don't have the `images` array yet.
  imageUrl: string | null;
  // Multi-image carousel. When non-empty, takes priority over imageUrl.
  // 1 image = static hero; 2+ = auto-advancing carousel with swipe.
  images: string[];
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  // Optional CTA pill button rendered below the subtitle on PageHero
  // (Groups / Events tabs). Both must be set to render. Home Hero ignores.
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export type RemoteContent = {
  header: HeroContent;       // Home tab full-bleed hero
  groupsHero: HeroContent;   // Groups tab card-style hero
  eventsHero: HeroContent;   // Events tab card-style hero
  sermonNotesUrl: string;
  featured: FeaturedItem[];
};

const EMPTY_HERO: HeroContent = {
  imageUrl: null,
  images: [],
  eyebrow: null,
  title: null,
  subtitle: null,
  ctaLabel: null,
  ctaUrl: null,
};

// Baked-in fallback. Keep in sync with featured.json so cold-start matches
// what most users see — at minimum, refresh this on every native build.
export const DEFAULT_CONTENT: RemoteContent = {
  header: { ...EMPTY_HERO },
  groupsHero: {
    ...EMPTY_HERO,
    ctaLabel: 'Find a Group',
    ctaUrl: 'https://mypointe.churchcenter.com/groups/pointe-groups-ministries?enrollment=open_signup%2Crequest_to_join&filter=enrollment',
  },
  eventsHero: {
    ...EMPTY_HERO,
    ctaLabel: 'See all events',
    ctaUrl: 'https://mypointe.churchcenter.com/registrations/events',
  },
  sermonNotesUrl: 'http://bible.com/events/49606016',
  featured: [
    {
      id: 'family-month',
      title: 'Family Month',
      dateLabel: 'ALL JUNE',
      description:
        'A whole month built around your family — Love Week, Movie Night, Bowling Night, and a sermon series focused on building stronger families. Something for everyone.',
      imageUrl: null,
      url: 'https://www.thepointe.online/familymonth/',
    },
    {
      id: 'vbs',
      title: 'Kingdom Quest VBS',
      dateLabel: 'JUL 13–16',
      description:
        "An epic 4-day journey to discover God's Kingdom. Free for kids K–5th, 9am–12:30pm.",
      imageUrl: 'https://www.thepointe.online/vbs/kingdom-quest.png',
      url: 'https://www.thepointe.online/vbs/',
    },
    {
      id: 'starting-pointe',
      title: 'Starting Pointe',
      dateLabel: 'JUN 7',
      description:
        'Get acquainted with the story, vision, and values of The Pointe. About an hour — first Sunday of every month.',
      imageUrl: null,
      url: 'https://mypointe.churchcenter.com/registrations/events/3512366',
    },
    {
      id: 'welcome-party',
      title: 'Welcome Party',
      dateLabel: 'RSVP NOW',
      description:
        "New around here? Meet the staff, grab dinner, and get connected. We can't wait to meet you!",
      imageUrl: null,
      url: 'https://mypointe.churchcenter.com/registrations/events/3639418',
    },
  ],
};

function normalizeHero(raw: any): HeroContent {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_HERO };
  return {
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : null,
    images: Array.isArray(raw.images)
      ? raw.images.filter((s: unknown): s is string => typeof s === 'string' && !!s)
      : [],
    eyebrow: typeof raw.eyebrow === 'string' ? raw.eyebrow : null,
    title: typeof raw.title === 'string' ? raw.title : null,
    subtitle: typeof raw.subtitle === 'string' ? raw.subtitle : null,
    ctaLabel: typeof raw.ctaLabel === 'string' ? raw.ctaLabel : null,
    ctaUrl: typeof raw.ctaUrl === 'string' ? raw.ctaUrl : null,
  };
}

let cached: RemoteContent | null = null;

// Read content directly from GitHub raw. Skips our Cloudflare Worker for
// reads — works on any network (including ones that block *.workers.dev),
// and there's no real cost since the Worker was only adding shape
// validation + a 60s cache layer (vs GitHub raw's ~5min CDN cache, which
// is plenty fast for a weekly-edited church content file).
//
// The Worker is still used for *writes* by the admin tool (proxied through
// thepointe.online/admin/api) and for push notifications.
const RAW_CONTENT_URL =
  'https://raw.githubusercontent.com/pastorderek81/pointe-content/main/featured.json';

async function fetchContent(): Promise<RemoteContent | null> {
  // Cache-bust per fetch. Android's OkHttp respects GitHub raw's ~5min CDN
  // Cache-Control more aggressively than iOS NSURLCache, so without this
  // Android users saw stale heroes long after the JSON was updated.
  return tryFetch(`${RAW_CONTENT_URL}?t=${Date.now()}`);
}

async function tryFetch(url: string): Promise<RemoteContent | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Partial<RemoteContent> & { header?: Partial<RemoteContent['header']> };
    // Normalize: tolerate older JSON that doesn't have the new optional
    // text fields yet (eyebrow / title / subtitle) — treat them as null.
    const normalized: RemoteContent = {
      header: normalizeHero(raw.header),
      groupsHero: normalizeHero((raw as any).groupsHero),
      eventsHero: normalizeHero((raw as any).eventsHero),
      sermonNotesUrl: raw.sermonNotesUrl ?? DEFAULT_CONTENT.sermonNotesUrl,
      featured: raw.featured ?? [],
    };
    cached = normalized;
    return normalized;
  } catch {
    return null;
  }
}

export function useRemoteContent(): { content: RemoteContent; refresh: () => Promise<void> } {
  const [content, setContent] = useState<RemoteContent>(cached ?? DEFAULT_CONTENT);

  const refresh = useCallback(async () => {
    const c = await fetchContent();
    if (c) setContent(c);
  }, []);

  useEffect(() => {
    let active = true;
    function load() {
      fetchContent().then((c) => {
        if (active && c) setContent(c);
      });
    }
    load();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') load();
    });
    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  return { content, refresh };
}
