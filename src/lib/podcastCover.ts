// Resolves podcast cover art from the live RSS feed for items whose ABS server
// cover / stored imageUrl is missing. The RSS feed exposes the artwork under
// `image` (raw feed shape), whereas the stored Podcast model uses `imageUrl`;
// older subscriptions saved before that mapping was fixed have neither, so we
// fetch the feed once (cached + de-duplicated) and read `image`/`imageUrl`.
import { getPodcastFeed } from '../api/abs';

const cache = new Map<string, string>();              // itemId -> resolved image URL
const inflight = new Map<string, Promise<string | null>>();

/** Synchronously read an already-resolved feed image (if any). */
export function cachedPodcastImage(itemId: string): string | undefined {
  return cache.get(itemId);
}

/** Fetch (once) the feed for `itemId` and resolve its cover art URL. Concurrent
 *  callers share the same in-flight request; results are cached for the session. */
export function resolvePodcastImage(serverUrl: string, itemId: string, feedUrl: string): Promise<string | null> {
  const hit = cache.get(itemId);
  if (hit) return Promise.resolve(hit);
  const pending = inflight.get(itemId);
  if (pending) return pending;

  const p = getPodcastFeed(serverUrl, feedUrl)
    .then(res => {
      const m = (res.podcast?.metadata ?? {}) as unknown as Record<string, unknown>;
      const url = (m.image as string) || (m.imageUrl as string) || null;
      if (url) cache.set(itemId, url);
      inflight.delete(itemId);
      return url;
    })
    .catch(e => {
      console.warn('[podcastCover] feed fetch failed for', itemId, e);
      inflight.delete(itemId);
      return null;
    });
  inflight.set(itemId, p);
  return p;
}
