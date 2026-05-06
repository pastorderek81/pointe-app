// Thin Planning Center API client. Two modes:
//   - Signed in: hits PCO directly with the user's OAuth Bearer token,
//     auto-refreshing if it's near expiry.
//   - Guest: hits the Cloudflare Worker proxy (which holds a server-side
//     PCO Personal Access Token) for the same paths. Same response shape
//     either way, so the rest of the app doesn't care.
//
// Docs: https://developer.planning.center/docs/
import { loadTokens, refreshIfNeeded } from './auth';
import { config, isPlaceholder } from '../config';

const PCO_BASE = 'https://api.planningcenteronline.com';

// PCO stores descriptions as HTML (rich text editor output). Strip tags +
// decode common entities so React Native's <Text> renders clean prose.
function stripHtml(input: string | null | undefined): string | null {
  if (!input) return null;
  const text = input
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&[a-z#0-9]+;/gi, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

async function authedFetch(path: string, init: RequestInit = {}) {
  const stored = await loadTokens();
  const headers = new Headers(init.headers as HeadersInit | undefined);
  headers.set('Accept', 'application/json');

  let url: string;
  if (stored) {
    const tokens = await refreshIfNeeded(stored);
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
    url = `${PCO_BASE}${path}`;
  } else {
    if (isPlaceholder(config.proxyUrl)) {
      throw new Error('Sign in to view this content');
    }
    url = `${config.proxyUrl.replace(/\/$/, '')}${path}`;
  }

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PCO ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export type PcoEvent = {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
  description: string | null;
  imageUrl: string | null;
  location: string | null;
};

export async function fetchUpcomingEvents(): Promise<PcoEvent[]> {
  // Calendar API: future event_instances, sorted by start time.
  const today = new Date().toISOString();
  const url = `/calendar/v2/event_instances?where[starts_at][gt]=${encodeURIComponent(
    today
  )}&order=starts_at&per_page=25&include=event`;
  const json = await authedFetch(url);
  const events = new Map<string, any>();
  for (const inc of json.included ?? []) {
    if (inc.type === 'Event') events.set(inc.id, inc);
  }
  return (json.data ?? []).map((row: any): PcoEvent => {
    const eventId = row.relationships?.event?.data?.id;
    const ev = eventId ? events.get(eventId) : null;
    return {
      id: row.id,
      name: ev?.attributes?.name ?? 'Untitled event',
      startsAt: row.attributes?.starts_at ?? null,
      endsAt: row.attributes?.ends_at ?? null,
      description: stripHtml(ev?.attributes?.description),
      imageUrl: ev?.attributes?.image_url ?? null,
      location: ev?.attributes?.featured ? 'Featured' : null,
    };
  });
}

export type PcoGroup = {
  id: string;
  name: string;
  description: string | null;
  scheduleText: string | null;
  imageUrl: string | null;
  membershipsCount: number;
  chatEnabled: boolean;
  churchCenterUrl: string;
};

const CHURCH_CENTER_BASE = 'https://mypointe.churchcenter.com';

export async function fetchGroups(): Promise<PcoGroup[]> {
  const json = await authedFetch('/groups/v2/groups?per_page=50&order=name');
  return (json.data ?? []).map(
    (row: any): PcoGroup => ({
      id: row.id,
      name: row.attributes?.name ?? 'Group',
      // PCO ships a pre-rendered plain-text version — use that over stripping HTML.
      description:
        row.attributes?.description_as_plain_text ?? stripHtml(row.attributes?.description),
      scheduleText: row.attributes?.schedule ?? null,
      imageUrl: row.attributes?.header_image?.medium ?? null,
      membershipsCount: row.attributes?.memberships_count ?? 0,
      chatEnabled: row.attributes?.chat_enabled === true,
      // public_church_center_web_url is null for unlisted groups; the
      // direct URL still works for signed-in members.
      churchCenterUrl:
        row.attributes?.public_church_center_web_url ?? `${CHURCH_CENTER_BASE}/groups/${row.id}`,
    })
  );
}

export type PcoSignup = {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  registrationUrl: string | null;
  createdAt: string | null;
};

// PCO Registrations API quirks: doesn't support `where[archived]` filtering
// and has no orderBy. Results are returned ascending by ID, so the newest
// sign-ups live at the end of the list. We page to the back, then filter
// client-side for currently open ones.
export async function fetchSignups(): Promise<PcoSignup[]> {
  // Step 1: peek at total count.
  const countJson = await authedFetch('/registrations/v2/signups?per_page=1');
  const total: number = countJson?.meta?.total_count ?? 0;
  if (total === 0) return [];

  // Step 2: fetch the last 100 entries (the most recently created ones).
  const perPage = 100;
  const offset = Math.max(0, total - perPage);
  const json = await authedFetch(
    `/registrations/v2/signups?per_page=${perPage}&offset=${offset}`
  );

  const all: PcoSignup[] = (json.data ?? [])
    .filter((row: any) => row.attributes?.archived === false && row.attributes?.closed === false)
    .map(
      (row: any): PcoSignup => ({
        id: row.id,
        name: row.attributes?.name ?? 'Untitled',
        description: stripHtml(row.attributes?.description),
        logoUrl: row.attributes?.logo_url ?? null,
        registrationUrl: row.attributes?.new_registration_url ?? null,
        createdAt: row.attributes?.created_at ?? null,
      })
    );

  // Newest first.
  return all.sort((a, b) => {
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  });
}

export async function fetchMe() {
  return authedFetch('/people/v2/me');
}
