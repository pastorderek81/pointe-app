// Current sermon series — pulled from YouTube.
//
// **Single source of truth: YouTube playlists.** Derek creates a new
// playlist for each series, uploads custom thumbnail in YouTube Studio,
// adds sermons to it. Both the app (here) and the website pull from
// the same place. Update once, propagates everywhere within an hour.
//
// The bundled fallback below is used when:
//  - The app is offline at first launch (no cached fetch yet)
//  - The YouTube API key isn't configured
//  - The fetch fails for any reason
import { useCallback, useEffect, useState } from 'react';
import { fetchCurrentSeries, YouTubeSeries } from '../media/youtube';

// Used as eyebrow + while loading + on errors.
export const SERIES_EYEBROW = 'NOW PLAYING';

// Bundled fallback. Update this when launching a series before YouTube is
// updated, or to handle the offline-first-launch case.
export const fallbackSeries: YouTubeSeries = {
  id: 'fallback',
  title: 'Faith in Action',
  subtitle: 'A study of 1st Corinthians',
  imageUrl: '',
};

export type SeriesState = {
  series: YouTubeSeries;
  loading: boolean;
  fromYouTube: boolean;
  error?: string;
};

export function useCurrentSeries(): SeriesState & { refresh: () => Promise<void> } {
  const [state, setState] = useState<SeriesState>({
    series: fallbackSeries,
    loading: true,
    fromYouTube: false,
  });

  const refresh = useCallback(async () => {
    try {
      const s = await fetchCurrentSeries();
      setState({ series: s, loading: false, fromYouTube: true });
    } catch (e: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: e?.message ?? 'YouTube fetch failed',
      }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchCurrentSeries()
      .then((s) => {
        if (cancelled) return;
        setState({ series: s, loading: false, fromYouTube: true });
      })
      .catch((e) => {
        if (cancelled) return;
        setState({
          series: fallbackSeries,
          loading: false,
          fromYouTube: false,
          error: e?.message ?? 'YouTube fetch failed',
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...state, refresh };
}
