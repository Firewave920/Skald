import { useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { OnyxState } from '../../state/onyx';
import {
  getCacheDir, revealCacheDir, getDownloads, removeDownload, cancelDownload,
} from '../../api/abs';
import type { DownloadRecord } from '../../api/abs';
import ConfirmDialog from '../ui/ConfirmDialog';
import Cover from '../Cover';
import { SectionHead, Row, MONO } from './shared';

// Format bytes as KB / MB / GB to one decimal place for size display.
function fmtSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Return a human-friendly relative time string from a Unix-ms timestamp.
function relativeTime(ms: number): string {
  const diff = (Date.now() - ms) / 1000; // seconds elapsed
  if (diff < 60)  return 'just now';
  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

// Small pill badge for features that are planned but not yet implemented.
function WipBadge() {
  return (
    <span style={{
      fontFamily: MONO,
      fontSize: 9,
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      color: 'var(--onyx-text-mute)',
      border: '1px solid var(--onyx-line)',
      borderRadius: 4,
      padding: '2px 6px',
    }}>
      WIP
    </span>
  );
}

// Tracks a single active download for the In Progress sub-section.
interface InProgressEntry {
  title: string;
  bytesDownloaded: number;
  totalBytes: number; // 0 when Content-Length is absent — renders indeterminate bar
}

interface Props { st: OnyxState; }

export default function DownloadsSection({ st }: Props) {
  const [cacheDir, setCacheDir] = useState('');
  // Local copy of the registry, kept in sync with Rust on mount and on events.
  const [records, setRecords] = useState<DownloadRecord[]>([]);
  // Record awaiting individual delete confirmation.
  const [pendingDelete, setPendingDelete] = useState<DownloadRecord | null>(null);
  // True when the "clear all" confirmation dialog is open.
  const [pendingClearAll, setPendingClearAll] = useState(false);
  // Active transfers keyed by itemId — populated/cleared by download-progress events.
  const [inProgress, setInProgress] = useState<Map<string, InProgressEntry>>(new Map());

  // Load cache dir path and completed downloads on mount.
  useEffect(() => {
    getCacheDir().then(setCacheDir).catch(console.error);
    getDownloads().then(setRecords).catch(console.error);
  }, []);

  // Subscribe to Rust download lifecycle events to keep the In Progress section live.
  useEffect(() => {
    let unlistenProgress:  (() => void) | undefined;
    let unlistenComplete:  (() => void) | undefined;
    let unlistenCancelled: (() => void) | undefined;
    let unlistenFailed:    (() => void) | undefined;

    // Each chunk from the Rust streaming loop updates or inserts an in-progress entry.
    listen<{ itemId: string; title: string; bytesDownloaded: number; totalBytes: number }>(
      'download-progress',
      event => {
        const { itemId, title, bytesDownloaded, totalBytes } = event.payload;
        setInProgress(prev => {
          const next = new Map(prev);
          next.set(itemId, { title, bytesDownloaded, totalBytes });
          return next;
        });
      },
    ).then(fn => { unlistenProgress = fn; });

    // Completion: remove from in-progress and refresh the completed registry.
    listen<{ itemId: string }>('download-complete', event => {
      const { itemId } = event.payload;
      setInProgress(prev => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
      // Re-fetch the registry so the newly completed entry appears without a page reload.
      getDownloads().then(setRecords).catch(console.error);
      // Note: st.downloads is refreshed by the listener in onyx.ts — no duplicate call needed.
    }).then(fn => { unlistenComplete = fn; });

    // Cancelled or failed: just remove from in-progress; no registry changes needed.
    const clearEntry = (itemId: string) =>
      setInProgress(prev => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });

    listen<{ itemId: string }>('download-cancelled', event => {
      clearEntry(event.payload.itemId);
    }).then(fn => { unlistenCancelled = fn; });

    listen<{ itemId: string }>('download-failed', event => {
      clearEntry(event.payload.itemId);
    }).then(fn => { unlistenFailed = fn; });

    return () => {
      unlistenProgress?.();
      unlistenComplete?.();
      unlistenCancelled?.();
      unlistenFailed?.();
    };
  }, []); // register once per mount — setters and st.setDownloads are stable

  // Sum all file sizes for the subtitle and the storage-used row.
  const totalBytes = records.reduce((sum, r) => sum + r.fileSize, 0);
  const storageLabel = totalBytes > 0 ? ` — ${fmtSize(totalBytes)} used` : '';

  // Confirm and execute deletion of a single downloaded book.
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    const record = pendingDelete;
    setPendingDelete(null);
    // Optimistic update: remove from local display and global state immediately.
    // The Rust command always clears the registry entry even when the file is gone,
    // so the UI stays consistent regardless of the actual disk outcome.
    setRecords(prev => prev.filter(r => r.itemId !== record.itemId));
    // Sync to global st.downloads so the offline playback router stops routing to
    // the now-deleted file without requiring a full app reload.
    st.setDownloads(prev => prev.filter(r => r.itemId !== record.itemId));
    try {
      await removeDownload(record.itemId);
      st.setToast({ message: `"${record.title}" removed from downloads`, type: 'success' });
    } catch {
      // File was already deleted outside the app — registry is still cleaned up by Rust.
      st.setToast({ message: `"${record.title}" was already gone — removed from list`, type: 'info' });
    }
  };

  // Confirm and execute deletion of every downloaded book in sequence.
  const handleConfirmClearAll = async () => {
    setPendingClearAll(false);
    // Snapshot and clear immediately so the UI reflects the intent before async work finishes.
    const snapshot = [...records];
    setRecords([]);
    st.setDownloads([]);
    let failed = 0;
    for (const record of snapshot) {
      try { await removeDownload(record.itemId); }
      // Count failures but continue — registry is cleaned up by Rust even when file is gone.
      catch { failed++; }
    }
    if (failed === 0) {
      st.setToast({
        message: `All ${snapshot.length} download${snapshot.length !== 1 ? 's' : ''} removed`,
        type: 'success',
      });
    } else {
      st.setToast({
        message: `Removed ${snapshot.length - failed} of ${snapshot.length} — ${failed} already gone`,
        type: 'info',
      });
    }
  };

  return (
    <div>
      <SectionHead
        title="Downloads"
        subtitle={`Offline copies and cache${storageLabel}.`}
      />

      {/* Cache location — shows the path to the downloads directory with a Reveal button. */}
      <Row label="Cache location" hint={cacheDir || 'Loading…'}>
        <button
          onClick={() => revealCacheDir().catch(console.error)}
          style={{
            padding: '6px 14px',
            fontSize: 11,
            fontFamily: MONO,
            letterSpacing: '0.06em',
            textTransform: 'uppercase' as const,
            background: 'var(--onyx-glass)',
            border: '1px solid var(--onyx-glass-edge)',
            borderRadius: 6,
            color: 'var(--onyx-text-dim)',
            cursor: 'pointer',
          }}
        >
          Reveal
        </button>
      </Row>

      {/* Maximum cache size — no configurable limit in v0.1.0; a cap can be a future feature. */}
      <Row
        label="Maximum cache size"
        hint="No limit set — manage individual downloads below."
      />

      {/* ── In Progress ────────────────────────────────────────────────────────
          Rendered only while at least one download is actively streaming from Rust.
          Each row shows the book title, a live progress bar, and a Cancel button. */}
      {inProgress.size > 0 && (
        <div>
          {/* Sub-section label */}
          <div style={{
            marginTop: 20,
            marginBottom: 4,
            fontSize: 11,
            fontFamily: MONO,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--onyx-text-mute)',
          }}>
            In Progress
          </div>

          {Array.from(inProgress.entries()).map(([itemId, { title, bytesDownloaded, totalBytes: total }]) => {
            // pct is null when the server didn't send Content-Length — shows indeterminate bar.
            const pct = total > 0 ? Math.min(100, (bytesDownloaded / total) * 100) : null;
            return (
              <div
                key={itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid var(--onyx-line)',
                  gap: 12,
                }}
              >
                {/* Title + progress bar + byte counter */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--onyx-text)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginBottom: 6,
                  }}>
                    {title}
                  </div>

                  {/* Compact 3px progress bar track */}
                  <div style={{
                    height: 3,
                    borderRadius: 2,
                    background: 'var(--onyx-glass-edge)',
                    overflow: 'hidden',
                  }}>
                    {pct !== null ? (
                      // Determinate: fill grows as bytes arrive.
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--onyx-accent)',
                        borderRadius: 2,
                        transition: 'width 0.2s ease',
                      }} />
                    ) : (
                      // Indeterminate: sliding shimmer when Content-Length is absent.
                      <div style={{
                        height: '100%',
                        width: '40%',
                        background: 'var(--onyx-accent)',
                        borderRadius: 2,
                        animation: 'onyx-indeterminate 1.4s ease-in-out infinite',
                      }} />
                    )}
                  </div>

                  {/* Byte counter below the bar */}
                  <div style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: 'var(--onyx-text-mute)',
                    fontFamily: MONO,
                  }}>
                    {total > 0
                      ? `${fmtSize(bytesDownloaded)} / ${fmtSize(total)}`
                      : fmtSize(bytesDownloaded)}
                  </div>
                </div>

                {/* Cancel button — signals Rust to abort on the next chunk boundary.
                    The download-cancelled event clears this row once the partial file
                    has been deleted by the Rust streaming loop. */}
                <button
                  onClick={() => cancelDownload(itemId).catch(console.error)}
                  title={`Cancel download of "${title}"`}
                  style={{
                    flexShrink: 0,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontFamily: MONO,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    background: 'transparent',
                    border: '1px solid var(--onyx-glass-edge)',
                    borderRadius: 6,
                    color: 'var(--onyx-text-dim)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Completed downloads list ───────────────────────────────────────────
          One row per book from the persistent downloads registry. Empty state
          shown when nothing is downloaded or currently downloading. */}
      {records.length === 0 && inProgress.size === 0 ? (
        // Empty state — nothing downloaded yet.
        <div style={{
          padding: '40px 0',
          textAlign: 'center',
          color: 'var(--onyx-text-mute)',
          fontSize: 13,
          fontFamily: MONO,
          letterSpacing: '0.04em',
        }}>
          No downloads yet
        </div>
      ) : records.length > 0 ? (
        <>
          {/* Sub-section label */}
          <div style={{
            marginTop: 20,
            marginBottom: 4,
            fontSize: 11,
            fontFamily: MONO,
            letterSpacing: '0.08em',
            textTransform: 'uppercase' as const,
            color: 'var(--onyx-text-mute)',
          }}>
            Downloaded Books
          </div>

          {records.map(record => {
            // Look up the full library item so we can render the cover thumbnail.
            // May be undefined if the book was removed from the server while the
            // local copy still exists — handled by the placeholder branch below.
            const libraryItem = st.library.find(b => b.id === record.itemId);

            return (
              <div
                key={record.itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: '1px solid var(--onyx-line)',
                  gap: 14,
                }}
              >
                {/* 40×40 cover thumbnail */}
                <div style={{
                  flexShrink: 0,
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: 'var(--onyx-glass)',
                }}>
                  {libraryItem ? (
                    // Use the shared Cover component which handles cover caching.
                    <Cover item={libraryItem} size={40} serverUrl={st.serverUrl} />
                  ) : (
                    // Fallback: first letter of title when item is no longer in the library.
                    <div style={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: MONO,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--onyx-text-mute)',
                    }}>
                      {record.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Book metadata — title at 14px, author/size/date at 11px muted */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    color: 'var(--onyx-text)',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {record.title}
                  </div>
                  <div style={{
                    marginTop: 3,
                    fontSize: 11,
                    color: 'var(--onyx-text-mute)',
                    fontFamily: MONO,
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'nowrap',
                    overflow: 'hidden',
                  }}>
                    {/* Author — default to "Unknown Author" when blank */}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                      {record.author || 'Unknown Author'}
                    </span>
                    <span style={{ color: 'var(--onyx-line)', flexShrink: 0 }}>·</span>
                    {/* File size */}
                    <span style={{ flexShrink: 0 }}>{fmtSize(record.fileSize)}</span>
                    <span style={{ color: 'var(--onyx-line)', flexShrink: 0 }}>·</span>
                    {/* Relative download date, e.g. "2 days ago" */}
                    <span style={{ flexShrink: 0 }}>{relativeTime(record.downloadedAt)}</span>
                  </div>
                  {/* Server-deleted warning — the book was removed from the server but
                      the local file is retained and still playable offline. */}
                  {record.serverDeleted && (
                    <div style={{
                      marginTop: 4,
                      fontSize: 10,
                      color: '#d4834a', // amber warning tone matching the shelf badge
                      fontFamily: MONO,
                      letterSpacing: '0.04em',
                    }}>
                      ⚠ No longer on server — local copy only
                    </div>
                  )}
                </div>

                {/* Trash delete button — opens ConfirmDialog before acting */}
                <button
                  onClick={() => setPendingDelete(record)}
                  title={`Remove "${record.title}" from downloads`}
                  style={{
                    flexShrink: 0,
                    padding: '5px 12px',
                    fontSize: 11,
                    fontFamily: MONO,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    background: 'transparent',
                    border: '1px solid rgba(232,113,106,0.35)',
                    borderRadius: 6,
                    color: '#e8716a',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })}

          {/* Clear all button — only rendered when there is at least one completed download. */}
          <div style={{ marginTop: 20, paddingBottom: 8, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setPendingClearAll(true)}
              style={{
                padding: '7px 16px',
                fontSize: 11,
                fontFamily: MONO,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
                background: 'transparent',
                border: '1px solid rgba(232,113,106,0.35)',
                borderRadius: 6,
                color: '#e8716a',
                cursor: 'pointer',
              }}
            >
              Clear All Downloads
            </button>
          </div>
        </>
      ) : null}

      {/* ── WIP settings rows ────────────────────────────────────────────────── */}

      {/* Auto-download next book in series — planned for Phase G. */}
      <Row label="Auto-download next in series">
        <WipBadge />
      </Row>

      {/* Keep downloaded books after finishing — planned for Phase G. */}
      <Row label="Keep downloads after finishing">
        <WipBadge />
      </Row>

      {/* ── Confirmation dialogs ─────────────────────────────────────────────── */}

      {/* Individual delete confirmation */}
      {pendingDelete && (
        <ConfirmDialog
          title={`Delete "${pendingDelete.title}"`}
          message={`This will remove the downloaded audio file (${fmtSize(pendingDelete.fileSize)}) from your device. The book will still be available for streaming from your server.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {/* Clear all confirmation */}
      {pendingClearAll && (
        <ConfirmDialog
          title="Clear all downloads?"
          message="This will delete all downloaded audio files from your device. This cannot be undone."
          confirmLabel="Clear All"
          danger
          onConfirm={handleConfirmClearAll}
          onCancel={() => setPendingClearAll(false)}
        />
      )}
    </div>
  );
}
