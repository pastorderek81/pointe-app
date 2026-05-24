// Saved sermons — persisted to SecureStore so users can flag messages
// to come back to later. Not sensitive data; we use SecureStore only
// because it's already a dependency.
//
// Stored as a JSON array under a versioned key so we can change the
// shape later without colliding with prior installs.
import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'saved_sermons_v1';

export type SavedSermon = {
  id: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  savedAt: string;
};

let cache: SavedSermon[] | null = null;
const subscribers = new Set<() => void>();

async function loadFromStorage(): Promise<SavedSermon[]> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function persist(items: SavedSermon[]) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // best effort
  }
}

function notify() {
  subscribers.forEach((cb) => cb());
}

export function useSavedSermons() {
  const [saved, setSaved] = useState<SavedSermon[]>(cache ?? []);

  useEffect(() => {
    let cancelled = false;
    if (cache === null) {
      loadFromStorage().then((items) => {
        if (cancelled) return;
        cache = items;
        setSaved(items);
      });
    }
    const sub = () => setSaved(cache ?? []);
    subscribers.add(sub);
    return () => {
      cancelled = true;
      subscribers.delete(sub);
    };
  }, []);

  const isSaved = useCallback(
    (id: string) => !!(cache ?? []).find((s) => s.id === id),
    [saved],
  );

  const toggle = useCallback(
    async (video: {
      id: string;
      title: string;
      thumbnailUrl: string;
      publishedAt: string;
    }) => {
      const current = cache ?? [];
      const exists = current.find((s) => s.id === video.id);
      const next = exists
        ? current.filter((s) => s.id !== video.id)
        : [
            {
              id: video.id,
              title: video.title,
              thumbnailUrl: video.thumbnailUrl,
              publishedAt: video.publishedAt,
              savedAt: new Date().toISOString(),
            },
            ...current,
          ];
      cache = next;
      notify();
      await persist(next);
    },
    [],
  );

  return { saved, isSaved, toggle };
}
