// YouTube Data API v3 — fetches the channel's videos AND the current series.
//
// "Current series" pattern: Derek creates a new YouTube playlist for each
// series, uploads a custom playlist thumbnail in YouTube Studio, then adds
// each new sermon to that playlist. The most-recently-published playlist
// is treated as the current series. Both the app and the website pull
// from this single source of truth.
//
// Setup: https://console.cloud.google.com/apis/credentials → create API key,
// restrict to YouTube Data API v3, drop into app.json `extra.youtubeApiKey`.
import { config, isPlaceholder } from '../../config';

export type YouTubeVideo = {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnailUrl: string;
  bibleUrl: string | null; // first bible.com URL found in the description
};

export type YouTubeSeries = {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
};

let cachedChannelId: string | null = null;

async function resolveChannelId(): Promise<string> {
  if (cachedChannelId) return cachedChannelId;
  const handle = config.youtubeChannelHandle.replace(/^@/, '');
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=@${handle}&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube channel lookup failed: ${res.status}`);
  const json = await res.json();
  const id = json.items?.[0]?.id;
  if (!id) throw new Error('Channel not found');
  cachedChannelId = id;
  return id;
}

function pickBestThumbnail(thumbnails: any): string {
  return (
    thumbnails?.maxres?.url ??
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.default?.url ??
    ''
  );
}

// Pulls the first YouVersion / Bible app URL out of a video description.
// Pattern covers bible.com/events/, my.bible.com, live.bible.com, etc.
const BIBLE_URL_RE = /(https?:\/\/(?:[a-z]+\.)?bible\.com\/[^\s)\]]+)/i;
export function extractBibleUrl(description: string): string | null {
  const m = description.match(BIBLE_URL_RE);
  return m ? m[1] : null;
}

// ---- Latest videos ----
export async function fetchLatestVideos(max = 20): Promise<YouTubeVideo[]> {
  if (isPlaceholder(config.youtubeApiKey)) throw new Error('YouTube API key not configured');
  const channelId = await resolveChannelId();
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=${max}&order=date&type=video&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search failed: ${res.status}`);
  const json = await res.json();
  return (json.items ?? []).map((item: any): YouTubeVideo => {
    const description = item.snippet?.description ?? '';
    return {
      id: item.id?.videoId,
      title: item.snippet?.title ?? '',
      description,
      publishedAt: item.snippet?.publishedAt ?? '',
      thumbnailUrl: pickBestThumbnail(item.snippet?.thumbnails),
      bibleUrl: extractBibleUrl(description),
    };
  });
}

// ---- Videos in a specific playlist ----
// We use this for the "Last Sunday's Message" card on Home — the current
// series playlist only contains actual sermon clips, so it filters out
// worship montages, announcements, livestream archives, etc.
export async function fetchPlaylistVideos(playlistId: string, max = 5): Promise<YouTubeVideo[]> {
  if (isPlaceholder(config.youtubeApiKey)) throw new Error('YouTube API key not configured');
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${max}&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube playlistItems failed: ${res.status}`);
  const json = await res.json();
  // Playlist items are returned in playlist position order. Sort by
  // publishedAt desc so the most recent sermon is first regardless of
  // how Derek arranged the playlist.
  const items = (json.items ?? []) as any[];
  return items
    .map((item: any): YouTubeVideo => {
      const description = item.snippet?.description ?? '';
      return {
        id: item.snippet?.resourceId?.videoId ?? '',
        title: item.snippet?.title ?? '',
        description,
        publishedAt: item.snippet?.publishedAt ?? '',
        thumbnailUrl: pickBestThumbnail(item.snippet?.thumbnails),
        bibleUrl: extractBibleUrl(description),
      };
    })
    .filter((v) => v.id)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function youtubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function youtubePlaylistUrl(playlistId: string) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

export function youtubeLiveUrl() {
  const handle = config.youtubeChannelHandle.replace(/^@/, '');
  return `https://www.youtube.com/@${handle}/live`;
}

// ---- All series (every playlist on the channel) ----
export async function fetchAllSeries(max = 25): Promise<YouTubeSeries[]> {
  if (isPlaceholder(config.youtubeApiKey)) throw new Error('YouTube API key not configured');
  const channelId = await resolveChannelId();
  const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=${max}&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube playlists failed: ${res.status}`);
  const json = await res.json();
  const playlists = (json.items ?? []) as any[];
  return playlists
    .slice()
    .sort(
      (a, b) =>
        new Date(b.snippet?.publishedAt ?? 0).getTime() -
        new Date(a.snippet?.publishedAt ?? 0).getTime(),
    )
    .map((p: any): YouTubeSeries => {
      const rawTitle = p.snippet?.title ?? '';
      const [titlePart, ...subParts] = rawTitle.split(/\s*[—–-]\s*/);
      const subtitleFromTitle = subParts.join(' — ').trim();
      const description = (p.snippet?.description ?? '').trim();
      return {
        id: p.id,
        title: titlePart.trim() || rawTitle,
        subtitle: subtitleFromTitle || description || '',
        imageUrl: pickBestThumbnail(p.snippet?.thumbnails),
      };
    });
}

// ---- Current series (most recent playlist) ----
type SeriesCache = { data: YouTubeSeries; fetchedAt: number } | null;
let seriesCache: SeriesCache = null;
const SERIES_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function fetchCurrentSeries(force = false): Promise<YouTubeSeries> {
  if (!force && seriesCache && Date.now() - seriesCache.fetchedAt < SERIES_TTL_MS) {
    return seriesCache.data;
  }
  if (isPlaceholder(config.youtubeApiKey)) throw new Error('YouTube API key not configured');

  const channelId = await resolveChannelId();
  const url = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${channelId}&maxResults=10&key=${config.youtubeApiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube playlists failed: ${res.status}`);
  const json = await res.json();

  const playlists = (json.items ?? []) as any[];
  if (playlists.length === 0) throw new Error('No playlists on channel');

  // Most recently published playlist = current series.
  const sorted = playlists
    .slice()
    .sort(
      (a, b) =>
        new Date(b.snippet?.publishedAt ?? 0).getTime() -
        new Date(a.snippet?.publishedAt ?? 0).getTime()
    );
  const top = sorted[0];

  // Title convention: "Series Name — Subtitle" or just "Series Name".
  const rawTitle = top.snippet?.title ?? '';
  const [titlePart, ...subParts] = rawTitle.split(/\s*[—–-]\s*/);
  const subtitleFromTitle = subParts.join(' — ').trim();
  const description = (top.snippet?.description ?? '').trim();

  const series: YouTubeSeries = {
    id: top.id,
    title: titlePart.trim() || rawTitle,
    subtitle: subtitleFromTitle || description || '',
    imageUrl: pickBestThumbnail(top.snippet?.thumbnails),
  };

  seriesCache = { data: series, fetchedAt: Date.now() };
  return series;
}

export function clearSeriesCache() {
  seriesCache = null;
}
