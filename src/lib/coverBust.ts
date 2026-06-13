// Tiny pub/sub used to force <Cover> components to reload after a cover changes.
// The on-disk cache file path (and thus the asset:// URL) is stable, so we also
// append a changing ?v token to the <img> src to defeat the WebView image cache.

type Listener = () => void;
const subs = new Map<string, Set<Listener>>();

/** Subscribe to cover-change events for one item. Returns an unsubscribe fn. */
export function subscribeCover(itemId: string, fn: Listener): () => void {
  let set = subs.get(itemId);
  if (!set) { set = new Set(); subs.set(itemId, set); }
  set.add(fn);
  return () => { set!.delete(fn); };
}

/** Signal that an item's cover changed — notifies any mounted <Cover> for it. */
export function bustCover(itemId: string): void {
  subs.get(itemId)?.forEach(fn => fn());
}
