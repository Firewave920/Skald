// UnidentifiedNotice — a bottom-right banner that surfaces local-library books
// sitting in the `_Unidentified` quarantine folder awaiting a metadata match.
//
// Books land in quarantine when the staging auto-import can't confidently
// identify them (no usable tags / folder layout). This notice makes that
// visible from anywhere in the app: a collapsed pill shows the count; clicking
// expands a list of the quarantined books; clicking a book opens the MatchModal
// to identify and file it. It refreshes on mount, whenever the local-library set
// changes, after a staging drop settles (`staging-changed`), and after a match.
import { useState, useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { OnyxState } from '../state/onyx';
import type { ScannedItem } from '../api/abs';
import { getUnidentifiedItems } from '../api/abs';
import MatchModal, { makeLocalQuarantineAdapter } from './MatchModal';
import Icon from './Icon';
import { log } from '../lib/log';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';

// One quarantined book, tagged with the library it belongs to.
interface QuarantineEntry {
  libId: string;
  libName: string;
  scanned: ScannedItem;
}

// Display title: prefer the scanned metadata title, fall back to the folder name.
function entryTitle(e: QuarantineEntry): string {
  const t = e.scanned.item?.media?.metadata?.title;
  if (t && t.trim()) return t;
  return e.scanned.sourcePath.split(/[\\/]/).filter(Boolean).pop() ?? 'Unknown';
}

export interface UnidentifiedNoticeProps { st: OnyxState; }

export default function UnidentifiedNotice({ st }: UnidentifiedNoticeProps) {
  const [entries, setEntries] = useState<QuarantineEntry[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [matchTarget, setMatchTarget] = useState<QuarantineEntry | null>(null);

  // Local libraries only — quarantine is a local-library concept. Keyed string so
  // the load effect re-runs when the set (not just array identity) changes.
  const localLibs = st.libraries.filter(l => l.source === 'local');
  const localKey = localLibs.map(l => l.id).join('|');

  // A ref to the latest local libraries so the event listener (registered once)
  // always scans the current set without re-subscribing.
  const localLibsRef = useRef(localLibs);
  localLibsRef.current = localLibs;

  const reload = useCallback(async () => {
    const libs = localLibsRef.current;
    const out: QuarantineEntry[] = [];
    await Promise.all(libs.map(async lib => {
      try {
        const items = await getUnidentifiedItems(lib.id);
        for (const scanned of items) out.push({ libId: lib.id, libName: lib.name, scanned });
      } catch (e) {
        log.warn('library', 'unidentified scan failed', { lib: lib.id, err: String(e) });
      }
    }));
    setEntries(out);
    // Collapse automatically once the queue is cleared.
    if (out.length === 0) setExpanded(false);
  }, []);

  // Reload on mount and whenever the local-library set changes.
  useEffect(() => { void reload(); }, [localKey, reload]);

  // After a staging drop is auto-imported (App.tsx debounces ~4s before filing),
  // re-scan a little later so newly quarantined books show up here.
  useEffect(() => {
    let un: (() => void) | undefined;
    let timer: number | null = null;
    listen('staging-changed', () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => { void reload(); }, 6000);
    }).then(fn => { un = fn; });
    return () => { un?.(); if (timer) window.clearTimeout(timer); };
  }, [reload]);

  if (entries.length === 0) return null;

  const count = entries.length;

  return (
    <>
      {/* Bottom-right notice — sits above the download toasts, below transient toasts. */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, width: expanded ? 340 : undefined }}>
        {expanded ? (
          <div style={{
            display: 'flex', flexDirection: 'column',
            background: 'var(--onyx-panel2)',
            backdropFilter: 'blur(40px) saturate(120%)',
            WebkitBackdropFilter: 'blur(40px) saturate(120%)',
            border: '1px solid var(--onyx-glass-edge)',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}>
            {/* Header — click to collapse */}
            <button
              onClick={() => setExpanded(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                background: 'none', border: 'none', borderBottom: '1px solid var(--onyx-line)',
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ color: 'var(--onyx-accent)', display: 'inline-flex', flexShrink: 0 }}>
                <Icon name="target" size={15} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500, color: 'var(--onyx-text)' }}>
                  {count} book{count === 1 ? '' : 's'} need matching
                </div>
                <div style={{ fontFamily: MONO, fontSize: 9.5, color: 'var(--onyx-text-mute)', letterSpacing: '0.06em', marginTop: 1 }}>
                  Click one to identify it
                </div>
              </div>
              <span style={{ color: 'var(--onyx-text-mute)', display: 'inline-flex', flexShrink: 0 }}>
                <Icon name="chevron-down" size={14} />
              </span>
            </button>

            {/* Item list */}
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {entries.map(e => (
                <button
                  key={e.scanned.sourcePath}
                  className="onyx-row"
                  onClick={() => setMatchTarget(e)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8,
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: 'var(--onyx-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entryTitle(e)}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 9.5, color: 'var(--onyx-text-mute)', letterSpacing: '0.04em', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.libName} · unidentified
                    </div>
                  </div>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, background: 'var(--onyx-accent-dim)', color: 'var(--onyx-accent)', border: '1px solid var(--onyx-accent-edge)', flexShrink: 0 }}>
                    Match
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Collapsed pill
          <button
            onClick={() => setExpanded(true)}
            title={`${count} book${count === 1 ? '' : 's'} need matching — click to review`}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', borderRadius: 999,
              background: 'var(--onyx-panel2)',
              backdropFilter: 'blur(40px) saturate(120%)',
              WebkitBackdropFilter: 'blur(40px) saturate(120%)',
              border: '1px solid var(--onyx-accent-edge)',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
              cursor: 'pointer',
            }}
          >
            <span style={{ color: 'var(--onyx-accent)', display: 'inline-flex' }}>
              <Icon name="target" size={15} />
            </span>
            <span style={{ fontSize: 12.5, color: 'var(--onyx-text)', fontWeight: 500 }}>
              {count} book{count === 1 ? '' : 's'} need matching
            </span>
            {/* Count badge */}
            <span style={{
              minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--onyx-accent)', color: 'var(--onyx-bg)', fontFamily: MONO, fontSize: 10, fontWeight: 600,
            }}>
              {count}
            </span>
          </button>
        )}
      </div>

      {/* Match modal — identify and file the selected quarantined book. */}
      {matchTarget && (
        <MatchModal
          item={matchTarget.scanned.item}
          adapter={makeLocalQuarantineAdapter(matchTarget.libId, matchTarget.scanned)}
          onClose={() => setMatchTarget(null)}
          onComplete={async () => {
            // The book was filed out of quarantine — refresh the active shelf (if
            // it's the library we matched in) and re-scan the queue.
            if (st.currentLibraryId === matchTarget.libId) {
              await st.setActiveLibrary(matchTarget.libId).catch(e => log.error('library', 'refresh after match failed', { err: String(e) }));
            } else {
              await st.refreshLibrary().catch(() => {});
            }
            setMatchTarget(null);
            void reload();
          }}
          onRefresh={() => {}}
        />
      )}
    </>
  );
}
