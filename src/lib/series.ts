// Next-in-series resolution for the "auto-download next in series" download
// behaviour (Settings → Downloads). Pure functions over the already-loaded
// library; no network. Series metadata lives on `item.media.metadata.series`
// (a SeriesObject or array) with an optional `sequence` that may be a number,
// a decimal string ("1.5"), or absent.
import type { LibraryItem, SeriesObject } from '../api/abs';

// Parse a series sequence to a comparable number, or null when absent/unparseable.
function parseSeq(v: SeriesObject['sequence']): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// Extract an item's primary series ({ name, sequence }), preferring the full
// series object(s) over the flat seriesName. Returns null when the item is not
// part of any series.
function primarySeries(item: LibraryItem): { name: string; sequence: number | null } | null {
  const s = item.media?.metadata?.series;
  const obj: SeriesObject | undefined = Array.isArray(s) ? s[0] : (s ?? undefined);
  if (obj?.name) return { name: obj.name, sequence: parseSeq(obj.sequence) };
  const name = item.media?.metadata?.seriesName;
  if (name) return { name, sequence: null };
  return null;
}

/**
 * Find the next book after `finished` in the same series within `library` — the
 * item with the smallest sequence strictly greater than the finished item's.
 * Returns `undefined` when the finished item has no comparable series sequence,
 * or nothing follows it. (A series with gaps simply takes the next-higher
 * sequence; ties and the finished item itself are skipped.)
 */
export function nextInSeries(finished: LibraryItem, library: LibraryItem[]): LibraryItem | undefined {
  const cur = primarySeries(finished);
  if (!cur || cur.sequence === null) return undefined;
  let best: { item: LibraryItem; sequence: number } | undefined;
  for (const it of library) {
    if (it.id === finished.id) continue;
    const s = primarySeries(it);
    if (!s || s.name !== cur.name || s.sequence === null) continue;
    if (s.sequence <= cur.sequence) continue;
    if (!best || s.sequence < best.sequence) best = { item: it, sequence: s.sequence };
  }
  return best?.item;
}
