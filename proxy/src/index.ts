// Pointe Church proxy worker.
//
// Four responsibilities:
//
// 1) PCO read-only proxy. Holds a Planning Center Personal Access Token in
//    env (set as a Cloudflare secret) and forwards a small allowlist of PCO
//    API paths to the app.
//
// 2) /content endpoint. Fetches featured.json from the public
//    `pointe-content` GitHub repo, validates its shape, and serves it to
//    the app with a 60-second cache.
//
// 3) Push notification registry + broadcast. Tokens stored in KV; broadcast
//    auth'd by PUSH_BROADCAST_SECRET (or admin Basic Auth via /admin).
//
// 4) /admin web UI. HTTP Basic Auth (single shared password in
//    ADMIN_PASSWORD secret). Lets staff send pushes and edit the home
//    screen content (commits to the GitHub repo via the GitHub API).
//
// PCO auth: Personal Access Tokens use HTTP Basic Auth with `app_id:secret`.
import { ADMIN_HTML } from './admin-page';

export interface Env {
  PCO_APP_ID: string;
  PCO_SECRET: string;
  PUSH_BROADCAST_SECRET?: string;
  PUSH_TOKENS?: KVNamespace;
  ADMIN_PASSWORD?: string;
  GITHUB_TOKEN?: string;
  YT_API_KEY?: string;
}

const ALLOWED_PATH_PREFIXES = [
  '/calendar/v2/event_instances',
  '/groups/v2/groups',
  '/registrations/v2/signups',
];

const PCO_CACHE_SECONDS = 300;

const CONTENT_REPO_OWNER = 'pastorderek81';
const CONTENT_REPO_NAME = 'pointe-content';
const CONTENT_FILE_PATH = 'featured.json';
const CONTENT_RAW_URL = `https://raw.githubusercontent.com/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/main/${CONTENT_FILE_PATH}`;
const CONTENT_API_URL = `https://api.github.com/repos/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/contents/${CONTENT_FILE_PATH}`;
const CONTENT_CACHE_SECONDS = 60;

// Image uploads land in pointe-content/images/, named by content hash so
// every distinct image gets a unique URL (avoids stale CDN cache when
// content changes) and identical re-uploads dedupe automatically.
const IMAGES_DIR = 'images';
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const IMAGE_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const PUSH_BATCH_SIZE = 100;

// Push broadcast history lives in the same KV as tokens to avoid an extra
// namespace binding. Discriminator: keys with this prefix are history
// records (JSON-encoded), all other keys are Expo push tokens.
const HISTORY_PREFIX = 'hist:';
const HISTORY_MAX_DEFAULT = 50;
const HISTORY_MAX_LIMIT = 100;

// /series.json — current sermon series, merged from YouTube + YouVersion.
// The latest YouTube playlist provides the playlist URL + thumbnail; the
// latest video's description should contain `Sermon Notes:
// https://www.bible.com/events/<id>`, and that YouVersion event page is
// where we get the branded series image, the series title, the editable
// description, and the primary scripture.
const SERIES_CHANNEL_HANDLE = '@thepointechurch4274';
const SERIES_CACHE_SECONDS = 3600; // 1 hour

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Public app endpoints
    if (url.pathname === '/content' && request.method === 'GET') {
      return handleContent();
    }
    if (url.pathname === '/series.json' && request.method === 'GET') {
      return handleSeries(env);
    }
    if (url.pathname === '/push/register' && request.method === 'POST') {
      return handlePushRegister(request, env);
    }
    if (url.pathname === '/push/broadcast' && request.method === 'POST') {
      return handlePushBroadcast(request, env);
    }
    if (url.pathname === '/push/history' && request.method === 'GET') {
      return handlePushHistory(url, env);
    }

    // Admin web UI + API (HTTP Basic Auth)
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return handleAdminPage(request, env);
    }
    if (url.pathname.startsWith('/admin/api/')) {
      return handleAdminApi(url.pathname, request, env);
    }

    // PCO proxy fallthrough
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }
    if (!ALLOWED_PATH_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return new Response('Path not allowed', { status: 403, headers: CORS_HEADERS });
    }

    const target = `https://api.planningcenteronline.com${url.pathname}${url.search}`;
    const cacheKey = new Request(target, { method: 'GET' });
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if (hit) return withCors(hit);

    const auth = btoa(`${env.PCO_APP_ID}:${env.PCO_SECRET}`);
    const upstream = await fetch(target, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    });

    const body = await upstream.text();
    const response = new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'application/json',
        'Cache-Control': `public, max-age=${PCO_CACHE_SECONDS}`,
      },
    });
    if (upstream.ok) await cache.put(cacheKey, response.clone());
    return withCors(response);
  },
};

// ============================================================
// Content endpoints (public GET + admin GET/POST via GitHub API)
// ============================================================

async function handleContent(): Promise<Response> {
  const cacheKey = new Request(CONTENT_RAW_URL, { method: 'GET' });
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return withCors(hit);

  let upstream: Response;
  try {
    upstream = await fetch(CONTENT_RAW_URL, { headers: { Accept: 'application/json' } });
  } catch {
    return jsonError(502, 'content_unreachable');
  }
  if (!upstream.ok) return jsonError(502, `content_upstream_${upstream.status}`);

  const text = await upstream.text();
  if (!isValidContent(text)) return jsonError(502, 'content_invalid_shape');

  const response = new Response(text, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${CONTENT_CACHE_SECONDS}`,
    },
  });
  await cache.put(cacheKey, response.clone());
  return withCors(response);
}

// ============================================================
// Current series (YouTube playlist + YouVersion event)
// ============================================================

interface SeriesPayload {
  title: string;
  subtitle: string;
  tagline: string;
  imageUrl: string;
  watchUrl: string;
  notesUrl: string;
  source: 'youtube+youversion' | 'youtube' | 'none';
  fetchedAt: string;
}

async function handleSeries(env: Env): Promise<Response> {
  const cacheKey = new Request('https://cache.thepointe.online/series.json', { method: 'GET' });
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return withCors(hit);

  if (!env.YT_API_KEY) return jsonError(503, 'yt_api_key_not_configured');

  let payload: SeriesPayload;
  try {
    payload = await buildSeriesPayload(env.YT_API_KEY);
  } catch (e) {
    return jsonError(502, 'series_upstream_failed');
  }

  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${SERIES_CACHE_SECONDS}`,
    },
  });
  await cache.put(cacheKey, response.clone());
  return withCors(response);
}

async function buildSeriesPayload(apiKey: string): Promise<SeriesPayload> {
  // 1. Resolve channel ID from handle
  const channelRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(SERIES_CHANNEL_HANDLE)}&key=${apiKey}`
  );
  if (!channelRes.ok) throw new Error('yt_channel');
  const channelJson = (await channelRes.json()) as { items?: Array<{ id?: string }> };
  const channelId = channelJson.items?.[0]?.id;
  if (!channelId) throw new Error('yt_channel_missing');

  // 2. Fetch playlists, pick the most recently published
  const playlistsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=10&key=${apiKey}`
  );
  if (!playlistsRes.ok) throw new Error('yt_playlists');
  const playlistsJson = (await playlistsRes.json()) as {
    items?: Array<{ id: string; snippet: { title: string; description?: string; publishedAt: string; thumbnails?: Record<string, { url?: string }> } }>;
  };
  const playlists = (playlistsJson.items ?? []).slice().sort((a, b) =>
    new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime()
  );
  if (!playlists.length) throw new Error('yt_no_playlists');
  const latest = playlists[0];

  // 3. Parse the playlist title — format is "Series — Subtitle" but often
  //    just "Series" (no dash). Either form is fine; we'll prefer the
  //    YouVersion title when available, since it's the authoritative one.
  const titleParts = latest.snippet.title.split(/\s*[—–-]\s*/);
  const ytTitle = titleParts[0].trim() || latest.snippet.title;
  const ytSubtitle = titleParts.slice(1).join(' — ').trim();
  // First line of the playlist description = pastor-owned tagline. The
  // playlist description is ALWAYS editable (unlike YouVersion events,
  // which become archived/read-only after the service weekend), so this
  // is the most reliable place for custom copy.
  const ytTagline = (latest.snippet.description ?? '').split('\n')[0].trim();
  const ytThumb = pickYtThumb(latest.snippet.thumbnails);
  const watchUrl = `https://www.youtube.com/playlist?list=${latest.id}`;

  // 4. Fetch the latest video in the playlist for its description (contains
  //    the YouVersion link)
  let notesUrl = '';
  let yvTitle = '';
  let yvDescription = '';
  let yvImage = '';
  let yvScripture = '';
  try {
    const itemsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${latest.id}&maxResults=1&key=${apiKey}`
    );
    if (itemsRes.ok) {
      const itemsJson = (await itemsRes.json()) as {
        items?: Array<{ snippet?: { description?: string } }>;
      };
      const desc = itemsJson.items?.[0]?.snippet?.description ?? '';
      const m = desc.match(/https?:\/\/(?:www\.)?bible\.com\/events\/(\d+)/i);
      if (m) {
        notesUrl = `https://www.bible.com/events/${m[1]}`;
        const yv = await fetchYouVersionEvent(notesUrl);
        if (yv) {
          yvTitle = yv.title;
          yvDescription = yv.description;
          yvImage = yv.imageUrl;
          yvScripture = yv.scripture;
        }
      }
    }
  } catch {
    // YouVersion is optional — proceed with YouTube-only data
  }

  const title = yvTitle || ytTitle;
  // Prefer the parsed scripture from YouVersion as the subtitle (e.g.
  // "Genesis 3"). Fall back to the playlist's "— Subtitle" portion if YT
  // happens to have one. Otherwise blank — the client just won't show it.
  const subtitle = yvScripture || ytSubtitle;
  // Tagline priority:
  //   1. YouTube playlist description (first line) — always editable, the
  //      most reliable source.
  //   2. YouVersion event description — fallback, but only if it doesn't
  //      look like date boilerplate ("Worship Services May 16/17").
  //   3. Blank — client keeps its hardcoded HTML fallback.
  let tagline = ytTagline;
  if (!tagline && !looksLikeBoilerplate(yvDescription)) tagline = yvDescription;
  const imageUrl = yvImage || ytThumb;

  return {
    title,
    subtitle,
    tagline,
    imageUrl,
    watchUrl,
    notesUrl,
    source: notesUrl ? 'youtube+youversion' : 'youtube',
    fetchedAt: new Date().toISOString(),
  };
}

function pickYtThumb(thumbs: Record<string, { url?: string }> | undefined): string {
  if (!thumbs) return '';
  return thumbs.maxres?.url || thumbs.standard?.url || thumbs.high?.url || thumbs.medium?.url || thumbs.default?.url || '';
}

function looksLikeBoilerplate(s: string): boolean {
  if (!s) return true;
  // "Worship Services May 16/17", "May 10/11", "April 4/5" — month + dates only
  const trimmed = s.trim();
  if (/^worship services?\b/i.test(trimmed)) return true;
  if (/^[a-z]+ \d+(\/\d+)?$/i.test(trimmed)) return true;
  return false;
}

interface YouVersionEvent {
  title: string;
  description: string;
  imageUrl: string;
  scripture: string;
}

async function fetchYouVersionEvent(eventUrl: string): Promise<YouVersionEvent | null> {
  const res = await fetch(eventUrl, {
    headers: {
      // Some hosts gate against unknown UAs; mimic a normal browser
      'User-Agent': 'Mozilla/5.0 (compatible; PointePeopleBot/1.0; +https://www.thepointe.online)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!res.ok) return null;
  const html = await res.text();

  // YouVersion is a Next.js app — the full event payload is embedded as JSON
  // in <script id="__NEXT_DATA__">…</script>. Pull that out.
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data: any;
  try { data = JSON.parse(m[1]); } catch { return null; }
  const event = data?.props?.pageProps?.event;
  if (!event || typeof event !== 'object') return null;

  const title = typeof event.title === 'string' ? event.title.trim() : '';
  const description = typeof event.description === 'string' ? event.description.trim() : '';

  // Pick the largest image variant we can (1440 wide preferred)
  let imageUrl = '';
  const images = Array.isArray(event.images) ? event.images : [];
  const byWidth = images
    .filter((img: any) => img && typeof img.url === 'string')
    .sort((a: any, b: any) => (b.width ?? 0) - (a.width ?? 0));
  if (byWidth[0]) {
    imageUrl = byWidth[0].url as string;
    // YouVersion returns protocol-relative URLs (`//imageproxy…`)
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
  }

  // Primary scripture: the first text content item usually starts with a
  // reference like "Genesis 3:1-10 The serpent was…". Grab the leading
  // book + chapter (drop the verse range — cleaner as a subtitle).
  let scripture = '';
  const content = Array.isArray(event.content) ? event.content : [];
  const firstText = content.find((c: any) => c?.type === 'text' && c?.data?.body);
  if (firstText) {
    const body = (firstText.data.body as string).replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ').trim();
    const ref = body.match(/^\s*((?:[1-3]\s+)?[A-Z][a-zA-Z]+)\s+(\d+)(?::\d+(?:-\d+)?)?/);
    if (ref) scripture = `${ref[1]} ${ref[2]}`;
  }

  return { title, description, imageUrl, scripture };
}

function isValidHero(raw: unknown, requireImageUrlField: boolean): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const h = raw as Record<string, unknown>;
  if (requireImageUrlField) {
    // Home `header` always carried `imageUrl` historically — keep the
    // strict check for it. New page heroes don't need this.
    if (h.imageUrl !== null && h.imageUrl !== undefined && typeof h.imageUrl !== 'string') return false;
  } else if (h.imageUrl !== undefined && h.imageUrl !== null && typeof h.imageUrl !== 'string') {
    return false;
  }
  if (h.images !== undefined) {
    if (!Array.isArray(h.images)) return false;
    for (const u of h.images) if (typeof u !== 'string' || !u) return false;
  }
  for (const k of ['eyebrow', 'title', 'subtitle', 'ctaLabel', 'ctaUrl'] as const) {
    const v = h[k];
    if (v !== undefined && v !== null && typeof v !== 'string') return false;
  }
  return true;
}

function isValidContent(text: string): boolean {
  let json: unknown;
  try { json = JSON.parse(text); } catch { return false; }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return false;
  const obj = json as Record<string, unknown>;

  if (!isValidHero(obj.header, true)) return false;
  // Optional per-page heroes — fine if absent.
  if (obj.groupsHero !== undefined && !isValidHero(obj.groupsHero, false)) return false;
  if (obj.eventsHero !== undefined && !isValidHero(obj.eventsHero, false)) return false;

  if (typeof obj.sermonNotesUrl !== 'string' || !obj.sermonNotesUrl) return false;

  if (!Array.isArray(obj.featured)) return false;
  for (const item of obj.featured) {
    if (!item || typeof item !== 'object') return false;
    const f = item as Record<string, unknown>;
    if (typeof f.id !== 'string' || !f.id) return false;
    if (typeof f.title !== 'string' || !f.title) return false;
    if (typeof f.dateLabel !== 'string') return false;
    if (typeof f.description !== 'string') return false;
    if (typeof f.url !== 'string' || !f.url) return false;
    if (f.imageUrl !== null && typeof f.imageUrl !== 'string') return false;
  }
  return true;
}

// ============================================================
// Push notifications
// ============================================================

async function handlePushRegister(request: Request, env: Env): Promise<Response> {
  if (!env.PUSH_TOKENS) return jsonError(503, 'push_kv_not_configured');

  let body: { token?: unknown; platform?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, 'invalid_json'); }

  const token = body.token;
  if (typeof token !== 'string' || !token.startsWith('ExponentPushToken[')) {
    return jsonError(400, 'invalid_token');
  }
  const platform = body.platform === 'ios' || body.platform === 'android' ? body.platform : 'unknown';
  const now = new Date().toISOString();

  const existingRaw = await env.PUSH_TOKENS.get(token);
  let meta: { platform: string; registeredAt: string; lastSeenAt: string };
  if (existingRaw) {
    try { meta = { ...JSON.parse(existingRaw), lastSeenAt: now }; }
    catch { meta = { platform, registeredAt: now, lastSeenAt: now }; }
  } else {
    meta = { platform, registeredAt: now, lastSeenAt: now };
  }
  await env.PUSH_TOKENS.put(token, JSON.stringify(meta));
  return jsonResponse(200, { ok: true });
}

async function handlePushBroadcast(request: Request, env: Env): Promise<Response> {
  if (!env.PUSH_BROADCAST_SECRET) return jsonError(503, 'broadcast_secret_not_configured');
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${env.PUSH_BROADCAST_SECRET}`) return jsonError(401, 'unauthorized');

  let body: { title?: unknown; body?: unknown; data?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, 'invalid_json'); }

  return performBroadcast(env, body);
}

async function performBroadcast(env: Env, body: { title?: unknown; body?: unknown; data?: unknown }): Promise<Response> {
  if (!env.PUSH_TOKENS) return jsonError(503, 'push_kv_not_configured');

  const title = body.title;
  const messageBody = body.body;
  if (typeof title !== 'string' || !title) return jsonError(400, 'missing_title');
  if (typeof messageBody !== 'string' || !messageBody) return jsonError(400, 'missing_body');
  const data = (body.data && typeof body.data === 'object' ? body.data : {}) as Record<string, unknown>;

  const tokens: string[] = [];
  let cursor: string | undefined;
  do {
    const result: KVNamespaceListResult<unknown, string> = await env.PUSH_TOKENS.list({ cursor });
    for (const k of result.keys) {
      // History records live in the same KV — skip them so we don't try to
      // send a push notification to a JSON-encoded history entry.
      if (k.name.startsWith(HISTORY_PREFIX)) continue;
      tokens.push(k.name);
    }
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  let sent = 0, removed = 0, failed = 0;

  for (let i = 0; i < tokens.length; i += PUSH_BATCH_SIZE) {
    const batch = tokens.slice(i, i + PUSH_BATCH_SIZE);
    const messages = batch.map((to) => ({ to, sound: 'default', title, body: messageBody, data }));

    let res: Response;
    try {
      res = await fetch(EXPO_PUSH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(messages),
      });
    } catch { failed += batch.length; continue; }

    if (!res.ok) { failed += batch.length; continue; }

    const json = (await res.json()) as { data?: Array<{ status: string; details?: { error?: string } }> };
    const tickets = json.data ?? [];
    for (let j = 0; j < tickets.length; j++) {
      const ticket = tickets[j];
      const tokenForTicket = batch[j];
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') {
        await env.PUSH_TOKENS.delete(tokenForTicket);
        removed++;
      } else failed++;
    }
  }

  // Log this broadcast to history so users can see what they've missed in
  // the in-app Notifications screen. Key format: `hist:<reverse-ts>-<rand>`
  // — reverse timestamp so list() returns newest first naturally.
  // Records auto-expire after 90 days to keep KV usage bounded.
  const sentAt = Date.now();
  const id = `${(2_000_000_000_000 - sentAt).toString().padStart(13, '0')}-${cryptoRandomHex(6)}`;
  const historyRecord = {
    id,
    title,
    body: messageBody,
    data,
    sentAt,
    sentCount: sent,
  };
  try {
    await env.PUSH_TOKENS.put(
      `${HISTORY_PREFIX}${id}`,
      JSON.stringify(historyRecord),
      { expirationTtl: 60 * 60 * 24 * 90 }, // 90 days
    );
  } catch {
    // History write failure is non-fatal — the push already shipped.
  }

  return jsonResponse(200, { total: tokens.length, sent, removed, failed });
}

function cryptoRandomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handlePushHistory(url: URL, env: Env): Promise<Response> {
  if (!env.PUSH_TOKENS) return jsonError(503, 'push_kv_not_configured');

  const limitParam = parseInt(url.searchParams.get('limit') || '', 10);
  const limit = Math.min(
    HISTORY_MAX_LIMIT,
    Math.max(1, Number.isFinite(limitParam) ? limitParam : HISTORY_MAX_DEFAULT),
  );

  // KV list() returns keys in lexicographic order. Our reverse-timestamp
  // key format means lexicographic order == newest first.
  const listed = await env.PUSH_TOKENS.list({ prefix: HISTORY_PREFIX, limit });
  const records = await Promise.all(
    listed.keys.map(async (k) => {
      const raw = await env.PUSH_TOKENS!.get(k.name);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    }),
  );

  return jsonResponse(200, {
    notifications: records.filter((r) => r !== null),
  });
}

// ============================================================
// Admin web UI + API
// ============================================================

function checkAdminAuth(request: Request, env: Env): Response | null {
  if (!env.ADMIN_PASSWORD) {
    return new Response('Admin not configured', { status: 503 });
  }
  const header = request.headers.get('Authorization') ?? '';
  if (header.startsWith('Basic ')) {
    let decoded = '';
    try { decoded = atob(header.slice(6)); } catch { decoded = ''; }
    const idx = decoded.indexOf(':');
    if (idx >= 0) {
      const password = decoded.slice(idx + 1);
      if (password === env.ADMIN_PASSWORD) return null; // authorized
    }
  }
  return new Response('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Pointe Admin", charset="UTF-8"' },
  });
}

async function handleAdminPage(request: Request, env: Env): Promise<Response> {
  const unauthorized = checkAdminAuth(request, env);
  if (unauthorized) return unauthorized;
  return new Response(ADMIN_HTML, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function handleAdminApi(pathname: string, request: Request, env: Env): Promise<Response> {
  const unauthorized = checkAdminAuth(request, env);
  if (unauthorized) return unauthorized;

  if (pathname === '/admin/api/content' && request.method === 'GET') {
    return handleAdminContentGet(env);
  }
  if (pathname === '/admin/api/content' && request.method === 'POST') {
    return handleAdminContentPost(request, env);
  }
  if (pathname === '/admin/api/push' && request.method === 'POST') {
    let body: { title?: unknown; body?: unknown };
    try { body = await request.json(); } catch { return jsonError(400, 'invalid_json'); }
    return performBroadcast(env, body);
  }
  if (pathname === '/admin/api/upload' && request.method === 'POST') {
    return handleAdminUpload(request, env);
  }
  return jsonError(404, 'not_found');
}

async function handleAdminContentGet(env: Env): Promise<Response> {
  if (!env.GITHUB_TOKEN) return jsonError(503, 'github_token_not_configured');

  const res = await fetch(CONTENT_API_URL, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pointe-pco-proxy',
    },
  });
  if (!res.ok) return jsonError(502, `github_${res.status}`);

  const json = (await res.json()) as { content?: string; sha?: string; encoding?: string };
  if (!json.content || !json.sha || json.encoding !== 'base64') {
    return jsonError(502, 'github_unexpected_shape');
  }
  // GitHub base64 has line breaks; strip them before decoding
  const decoded = atob(json.content.replace(/\n/g, ''));
  let parsed: unknown;
  try { parsed = JSON.parse(decoded); } catch { return jsonError(502, 'content_invalid_json'); }
  return jsonResponse(200, { content: parsed, sha: json.sha });
}

async function handleAdminContentPost(request: Request, env: Env): Promise<Response> {
  if (!env.GITHUB_TOKEN) return jsonError(503, 'github_token_not_configured');

  let body: { content?: unknown; sha?: unknown };
  try { body = await request.json(); } catch { return jsonError(400, 'invalid_json'); }

  if (!body.content || typeof body.content !== 'object' || Array.isArray(body.content)) {
    return jsonError(400, 'invalid_content');
  }
  if (typeof body.sha !== 'string' || !body.sha) return jsonError(400, 'missing_sha');

  const serialized = JSON.stringify(body.content, null, 2) + '\n';
  if (!isValidContent(serialized)) return jsonError(400, 'content_failed_validation');

  const encoded = base64Encode(serialized);
  const commitMessage = `Update featured.json (admin · ${new Date().toISOString()})`;

  const res = await fetch(CONTENT_API_URL, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'pointe-pco-proxy',
    },
    body: JSON.stringify({
      message: commitMessage,
      content: encoded,
      sha: body.sha,
    }),
  });

  if (res.status === 409) return jsonError(409, 'sha_conflict_reload_and_retry');
  if (!res.ok) {
    const detail = await res.text();
    return jsonError(502, `github_${res.status}: ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { content?: { sha?: string } };
  // Bust the public-content cache so the new JSON propagates fast.
  await caches.default.delete(new Request(CONTENT_RAW_URL, { method: 'GET' }));
  return jsonResponse(200, { ok: true, sha: json.content?.sha });
}

function base64Encode(s: string): string {
  // Worker runtimes don't have Buffer; use TextEncoder + btoa.
  const bytes = new TextEncoder().encode(s);
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  // Chunked because String.fromCharCode(...bytes) overflows the call stack
  // on >100KB inputs.
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}

async function handleAdminUpload(request: Request, env: Env): Promise<Response> {
  if (!env.GITHUB_TOKEN) return jsonError(503, 'github_token_not_configured');

  const ctype = request.headers.get('Content-Type') ?? '';
  if (!ctype.toLowerCase().startsWith('multipart/form-data')) {
    return jsonError(400, 'expected_multipart');
  }

  let form: FormData;
  try { form = await request.formData(); } catch { return jsonError(400, 'invalid_form'); }
  const file = form.get('file');
  // Duck-type check — File DOM type isn't in our @cloudflare/workers-types lib,
  // but FormData entries that are uploaded files always expose these props.
  if (!file || typeof file === 'string') return jsonError(400, 'no_file');
  const fileLike = file as unknown as { type: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> };
  if (typeof fileLike.arrayBuffer !== 'function') return jsonError(400, 'no_file');

  const ext = IMAGE_MIME_TO_EXT[fileLike.type];
  if (!ext) return jsonError(400, `unsupported_type_${fileLike.type || 'unknown'}`);

  if (fileLike.size > IMAGE_MAX_BYTES) {
    return jsonError(413, `file_too_large_max_${IMAGE_MAX_BYTES}`);
  }

  const buffer = await fileLike.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  const filename = `${hashHex}.${ext}`;
  const path = `${IMAGES_DIR}/${filename}`;
  const apiUrl = `https://api.github.com/repos/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/contents/${path}`;
  const rawUrl = `https://raw.githubusercontent.com/${CONTENT_REPO_OWNER}/${CONTENT_REPO_NAME}/main/${path}`;

  // Dedupe: if the file already exists at this hash, skip the commit.
  const existing = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'pointe-pco-proxy',
    },
  });
  if (existing.status === 200) {
    return jsonResponse(200, { url: rawUrl, deduped: true });
  }
  if (existing.status !== 404) {
    return jsonError(502, `github_check_${existing.status}`);
  }

  const encoded = bytesToBase64(bytes);
  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'pointe-pco-proxy',
    },
    body: JSON.stringify({
      message: `Upload image: ${filename}`,
      content: encoded,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return jsonError(502, `github_${res.status}: ${detail.slice(0, 200)}`);
  }

  return jsonResponse(200, { url: rawUrl });
}

// ============================================================
// Helpers
// ============================================================

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function jsonError(status: number, code: string): Response {
  return jsonResponse(status, { error: code });
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
