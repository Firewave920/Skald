// ListeningSessionsSection — shown under Settings → Playback → Sessions.
//
// Two Glass cards stacked vertically:
//   1. Listening Sessions — paginated historical table with user filter (admin)
//      and per-row delete (admin).
//   2. Open Listening Sessions — sessions updated within the last 5 minutes,
//      auto-refreshed every 30 s. (ABS has no dedicated open-sessions endpoint;
//      recency of updatedAt is used as a proxy for an active/open session.)

import { useState, useEffect, useCallback, useMemo } from 'react'; // useMemo added for sorted sessions
import type { OnyxState } from '../../state/onyx';
import { SERIF, MONO } from './shared';
import ConfirmDialog from '../ui/ConfirmDialog';
import {
  getListeningSessions,
  deleteSession,
  getAllUsers,
} from '../../api/abs';
import type { ListeningSession, AdminUser } from '../../api/abs';

// ── Sort value extractor ────────────────────────────────────────────────────

// Returns the value used for sorting a session by the given column key.
// Handles nested fields (device client name, cross-endpoint username) that
// cannot be reached by simple dynamic property access.
function getSortVal(s: ListeningSession, key: string): string | number {
  switch (key) {
    case 'displayTitle':  return s.displayTitle ?? '';             // ITEM column
    case 'username':      return s.username ?? s.user?.username ?? ''; // USER — flat or nested
    case 'device':        return s.deviceInfo?.clientName ?? '';   // DEVICE INFO column
    case 'timeListening': return s.timeListening ?? 0;             // TIME LISTENED
    case 'currentTime':   return s.currentTime ?? 0;              // LAST TIME (position)
    case 'updatedAt':     return s.updatedAt ?? 0;                // LAST UPDATE
    default:              return '';
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format seconds as "Xh Ym" or "Xm" for the Time Listened column. */
function fmtDuration(secs: number | null): string {
  if (secs === null || secs <= 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.round(secs)}s`;
}

/** Format seconds as "H:MM:SS" for the Last Time (position) column. */
function fmtTimecode(secs: number | null): string {
  if (secs === null || secs < 0) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Human-readable relative time from a Unix-ms timestamp. */
function relativeTime(ms: number | null): string {
  if (ms === null) return '—';
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/** Convert ABS playMethod integer to a short label. */
function fmtPlayMethod(method: number | null): string {
  switch (method) {
    case 0: return 'Direct';
    case 1: return 'Stream';
    case 2: return 'Transcode';
    case 3: return 'Local';
    default: return '—';
  }
}

// ── Sub-components ──────────────────────────────────────────────────────────

// Feather-style trash SVG for the delete row button (matches AccountSection).
const TrashIcon = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

// Column header cell — mono, uppercase, muted.
// When onClick is supplied the cell is sortable: a ▲/▼ indicator shows on the active column.
function TH({
  children,
  w,
  onClick,  // supplied for sortable columns; omitted for non-sortable (delete, actions)
  active,   // true when this column is the current sort key
  dir,      // current sort direction — drives the ▲/▼ indicator
}: {
  children?: React.ReactNode;
  w?: number;
  onClick?: () => void;
  active?: boolean;
  dir?: 'asc' | 'desc';
}) {
  return (
    <th
      onClick={onClick}
      style={{
        fontFamily: MONO,
        fontSize: 9,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: active ? 'var(--onyx-accent)' : 'var(--onyx-text-mute)', // accent on active column
        fontWeight: active ? 600 : 400, // bold on active column
        textAlign: 'left',
        padding: '0 12px 10px 0',
        whiteSpace: 'nowrap',
        width: w,
        cursor: onClick ? 'pointer' : undefined, // pointer cursor when sortable
        userSelect: 'none', // prevent text selection on rapid double-clicks
      }}
    >
      {children}
      {/* Sort direction arrow — only shown on the active sort column */}
      {active && (
        <span style={{ marginLeft: 4, fontSize: 8 }}>
          {dir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </th>
  );
}

// Data cell — consistent padding, clipping.
function TD({
  children,
  muted,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <td style={{
      padding: '10px 12px 10px 0',
      borderTop: '1px solid var(--onyx-line)',
      fontSize: 13,
      color: muted ? 'var(--onyx-text-mute)' : 'var(--onyx-text)',
      verticalAlign: 'top',
      maxWidth: 0, // allows text-overflow inside a table cell
    }}>
      {children}
    </td>
  );
}

// One row in the sessions table.
function SessionRow({
  session,
  showUser,
  showDelete,
  onDelete,
}: {
  session: ListeningSession;
  showUser: boolean;     // only admin sees the USER column
  showDelete: boolean;   // only admin sees the delete button
  onDelete: () => void;
}) {
  return (
    <tr>
      {/* ITEM: title + author in muted subtext */}
      <TD>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.displayTitle ?? '—'}
        </div>
        {session.author && (
          // Muted author line below title
          <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--onyx-text-mute)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.author}
          </div>
        )}
      </TD>

      {/* USER — admin only */}
      {showUser && (
        <TD muted>
          <span style={{ fontFamily: MONO, fontSize: 11 }}>
            {/* Prefer flat username (per-user endpoints), fall back to the nested user object
                (GET /api/sessions), then the first 8 chars of userId as a last resort. */}
            {session.username ?? session.user?.username ?? session.userId.slice(0, 8)}
          </span>
        </TD>
      )}

      {/* DEVICE INFO: client name + method */}
      <TD muted>
        <div style={{ fontFamily: MONO, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {session.deviceInfo?.clientName ?? '—'}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 9, color: 'var(--onyx-text-mute)', marginTop: 2 }}>
          {fmtPlayMethod(session.playMethod)}
        </div>
      </TD>

      {/* TIME LISTENED */}
      <TD muted>
        <span style={{ fontFamily: MONO, fontSize: 12 }}>
          {fmtDuration(session.timeListening)}
        </span>
      </TD>

      {/* LAST TIME (playback position) */}
      <TD muted>
        <span style={{ fontFamily: MONO, fontSize: 12 }}>
          {fmtTimecode(session.currentTime)}
        </span>
      </TD>

      {/* LAST UPDATE */}
      <TD muted>
        <span style={{ fontFamily: MONO, fontSize: 11 }}>
          {relativeTime(session.updatedAt)}
        </span>
      </TD>

      {/* DELETE — admin only */}
      {showDelete && (
        <td style={{ padding: '10px 0', borderTop: '1px solid var(--onyx-line)', verticalAlign: 'top' }}>
          <button
            onClick={onDelete}
            title="Delete session"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: 'none',
              background: 'transparent',
              color: '#e8716a', // danger red — matches AccountSection
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            {TrashIcon}
          </button>
        </td>
      )}
    </tr>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export interface ListeningSessionsSectionProps {
  st: OnyxState;
}

export default function ListeningSessionsSection({ st }: ListeningSessionsSectionProps) {
  // Admin gate — drives the user-filter dropdown and the delete button.
  // st?.user?.type uses optional chaining on st itself to survive HMR transient renders
  // where st may be undefined before the parent has re-rendered with valid props.
  const isAdmin = st?.user?.type === 'admin' || st?.user?.type === 'root';

  // ── Historical sessions state ───────────────────────────────────────────
  const [sessions, setSessions]           = useState<ListeningSession[]>([]);
  const [total, setTotal]                 = useState(0);
  const [numPages, setNumPages]           = useState(1);
  const [page, setPage]                   = useState(0); // 0-indexed, matches ABS
  const [itemsPerPage, setItemsPerPage]   = useState(10);
  // Filter selection — three states:
  //   null     → All Users (admin only, default for admins) → GET /api/sessions
  //   '__me__' → own sessions → GET /api/me/listening-sessions
  //   '<id>'   → specific user (admin only) → GET /api/users/{id}/listening-sessions
  // Defaults to null (All Users) so admins see cross-user data immediately on mount.
  const [filterUserId, setFilterUserId]   = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  // Confirm dialog state for session deletion.
  const [deleteTarget, setDeleteTarget]   = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Admin-only: full user list for the filter dropdown.
  const [allUsers, setAllUsers]           = useState<AdminUser[]>([]);

  // ── Open sessions state ─────────────────────────────────────────────────
  const [openSessions, setOpenSessions]   = useState<ListeningSession[]>([]);
  const [openLoading, setOpenLoading]     = useState(false);

  // ── Sort state ────────────────────────────────────────────────────────────
  // Tracks which column is sorted and in which direction.
  // Default: sort by LAST UPDATE descending so newest sessions appear first.
  const [sortKey, setSortKey] = useState<string>('updatedAt'); // active sort column key
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc'); // active sort direction

  // Sorted sessions — recomputed only when the sessions data, sort key, or direction changes.
  // Sorts client-side within the current page; server-side sorting across pages is not yet needed.
  const sortedSessions = useMemo(() => {
    const copy = [...sessions]; // avoid mutating the state array
    copy.sort((a, b) => {
      const av = getSortVal(a, sortKey); // extract comparable value for row a
      const bv = getSortVal(b, sortKey); // extract comparable value for row b
      // Numeric fields (timestamps, durations) compare as numbers for correct ordering.
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      // String fields compare case-insensitively using locale-aware comparison.
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [sessions, sortKey, sortDir]); // only recompute when these three change

  // ── Fetch helpers ────────────────────────────────────────────────────────

  // Fetch a page of historical sessions. Wrapped in useCallback so it can be
  // called from effects and from pagination controls without stale closures.
  const loadSessions = useCallback(async (
    uid: string | null, // null = All Users; '__me__' = own; '<id>' = specific user
    pg: number,
    perPage: number,
  ) => {
    if (!st?.serverUrl) return; // optional chaining: safe when st is transiently undefined
    setLoading(true);
    setError('');
    try {
      // Non-admin users always fetch their own sessions regardless of uid.
      // Admins pass uid through: null → all users, '__me__' → own, id → specific user.
      const effectiveUid = isAdmin ? uid : '__me__';
      const res = await getListeningSessions(st.serverUrl, effectiveUid, pg, perPage); // st defined: guard passed
      setSessions(res.sessions);
      setTotal(res.total);
      // numPages from the server may be 0 when there are no sessions — clamp to 1.
      setNumPages(Math.max(1, res.numPages));
    } catch (e) {
      setError(typeof e === 'string' ? e : (e as Error)?.message ?? 'Failed to load sessions.');
    } finally {
      setLoading(false);
    }
  }, [st?.serverUrl]); // dep array: optional chaining prevents crash when st is undefined

  // Fetch open sessions — page 0, large page to capture all recent activity —
  // then filter client-side to sessions updated within the last 5 minutes.
  // This is a proxy because ABS has no dedicated open-sessions endpoint.
  const loadOpenSessions = useCallback(async () => {
    if (!st?.serverUrl) return; // optional chaining: safe when st is transiently undefined
    setOpenLoading(true);
    try {
      // '__me__' explicitly requests own sessions via GET /api/me/listening-sessions.
      // Passing null here would target GET /api/sessions (all users), which is wrong for
      // the open-sessions panel — we only want to surface own open sessions as a proxy.
      const res = await getListeningSessions(st.serverUrl, '__me__', 0, 50); // st defined: guard passed
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5-minute recency window
      // A session is considered "open" if its updatedAt is within the last 5 minutes.
      const open = res.sessions.filter(s => s.updatedAt !== null && s.updatedAt > fiveMinutesAgo);
      setOpenSessions(open);
    } catch {
      // Open sessions are best-effort; silently ignore errors to avoid cluttering the UI.
    } finally {
      setOpenLoading(false);
    }
  }, [st?.serverUrl]); // dep array: optional chaining prevents crash when st is undefined

  // ── Effects ──────────────────────────────────────────────────────────────

  // Load admin user list once on mount — needed for the filter dropdown.
  useEffect(() => {
    if (!isAdmin || !st?.serverUrl) return; // optional chaining: safe when st is transiently undefined
    getAllUsers(st.serverUrl).then(setAllUsers).catch(console.error); // st defined: guard passed
  }, [isAdmin, st?.serverUrl]); // dep array: optional chaining on st

  // Reload historical sessions whenever filter, page, or page size changes.
  useEffect(() => {
    loadSessions(filterUserId, page, itemsPerPage);
  }, [loadSessions, filterUserId, page, itemsPerPage]);

  // Load open sessions on mount and refresh every 30 seconds automatically.
  useEffect(() => {
    loadOpenSessions();
    const timer = setInterval(loadOpenSessions, 30_000); // 30-second auto-refresh
    return () => clearInterval(timer); // clean up on unmount
  }, [loadOpenSessions]);

  // Guard against rendering before auth state is loaded — st.user is null on
  // first render when the app starts without a stored session token. All hooks
  // above have already been called unconditionally (required by React's rules of
  // hooks), so this early return is safe here after all useState/useCallback/useEffect.
  if (!st?.user) {
    return (
      <div style={{ color: 'var(--onyx-text-mute)', fontSize: 13, padding: 24 }}>
        Loading…
      </div>
    );
  }

  // ── Delete handler ────────────────────────────────────────────────────────

  async function handleDeleteConfirmed() {
    if (!deleteTarget || !st.serverUrl) return;
    setDeletePending(true);
    try {
      await deleteSession(st.serverUrl, deleteTarget);
      // Refresh both lists after a successful deletion.
      await Promise.all([
        loadSessions(filterUserId, page, itemsPerPage),
        loadOpenSessions(),
      ]);
    } catch (e) {
      setError(typeof e === 'string' ? e : (e as Error)?.message ?? 'Delete failed.');
    } finally {
      setDeletePending(false);
      setDeleteTarget(null);
    }
  }

  // ── Table shared styles ────────────────────────────────────────────────────

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 13,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Card 1: Historical listening sessions ─────────────────────────── */}
      <div>
        {/* Card header: title + admin user-filter dropdown */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500 }}>
            Listening Sessions
          </div>

          {/* Admin-only filter dropdown — not shown to non-admins */}
          {isAdmin && (
            <select
              // null (All Users) maps to the empty-string option value.
              value={filterUserId ?? ''}
              onChange={e => {
                // Reset to page 0 whenever the user filter changes.
                setPage(0);
                const val = e.target.value;
                // '' → null (All Users); any other string passes through as-is.
                setFilterUserId(val === '' ? null : val);
              }}
              style={{
                padding: '6px 10px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--onyx-glass-edge)',
                borderRadius: 7,
                color: 'var(--onyx-text)',
                fontFamily: MONO,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {/* All Users — default for admins; maps to null → GET /api/sessions */}
              <option value="">All Users</option>
              {/* My sessions — '__me__' sentinel → GET /api/me/listening-sessions */}
              <option value="__me__">My sessions</option>
              {/* Per-user options — specific user ID → GET /api/users/{id}/listening-sessions */}
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.username}</option>
              ))}
            </select>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div style={{ fontFamily: MONO, fontSize: 11, color: '#e8716a', marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* Sessions table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {/* Each sortable header receives onClick to toggle sort, plus active/dir for the indicator */}
                <TH
                  onClick={() => { // ITEM sorts by display title
                    sortKey === 'displayTitle' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') // toggle direction
                      : (setSortKey('displayTitle'), setSortDir('desc')); // new column → default desc
                  }}
                  active={sortKey === 'displayTitle'} // highlight when this column is active
                  dir={sortDir}                       // direction drives the ▲/▼ indicator
                >Item</TH>
                {/* USER column only visible to admins */}
                {isAdmin && (
                  <TH
                    w={90}
                    onClick={() => { // USER sorts by username (flat or nested)
                      sortKey === 'username' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                        : (setSortKey('username'), setSortDir('asc')); // names default ascending
                    }}
                    active={sortKey === 'username'}
                    dir={sortDir}
                  >User</TH>
                )}
                <TH
                  w={120}
                  onClick={() => { // DEVICE sorts by client name
                    sortKey === 'device' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                      : (setSortKey('device'), setSortDir('asc'));
                  }}
                  active={sortKey === 'device'}
                  dir={sortDir}
                >Device</TH>
                <TH
                  w={80}
                  onClick={() => { // TIME LISTENED sorts by seconds listened
                    sortKey === 'timeListening' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                      : (setSortKey('timeListening'), setSortDir('desc')); // most listened first
                  }}
                  active={sortKey === 'timeListening'}
                  dir={sortDir}
                >Listened</TH>
                <TH
                  w={80}
                  onClick={() => { // POSITION sorts by current playback time (seconds)
                    sortKey === 'currentTime' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                      : (setSortKey('currentTime'), setSortDir('desc'));
                  }}
                  active={sortKey === 'currentTime'}
                  dir={sortDir}
                >Position</TH>
                <TH
                  w={80}
                  onClick={() => { // LAST UPDATE sorts by updatedAt timestamp
                    sortKey === 'updatedAt' ? setSortDir(d => d === 'asc' ? 'desc' : 'asc')
                      : (setSortKey('updatedAt'), setSortDir('desc')); // newest first by default
                  }}
                  active={sortKey === 'updatedAt'}
                  dir={sortDir}
                >Updated</TH>
                {/* Delete column header — not sortable, no onClick */}
                {isAdmin && <TH w={32}></TH>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // Loading placeholder row
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} style={{ padding: '18px 0', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>
                    Loading…
                  </td>
                </tr>
              ) : sortedSessions.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={isAdmin ? 7 : 5} style={{ padding: '18px 0', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>
                    No sessions found.
                  </td>
                </tr>
              ) : (
                // Render sortedSessions — same data as sessions but in the chosen order
                sortedSessions.map(s => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    showUser={isAdmin}
                    showDelete={isAdmin}
                    // Clicking delete opens the confirmation dialog.
                    onDelete={() => setDeleteTarget(s.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14, fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>
          {/* Rows-per-page selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Rows per page:</span>
            <select
              value={itemsPerPage}
              onChange={e => {
                // Reset to page 0 when the page size changes.
                setPage(0);
                setItemsPerPage(Number(e.target.value));
              }}
              style={{
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--onyx-glass-edge)',
                borderRadius: 5,
                color: 'var(--onyx-text)',
                fontFamily: MONO,
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          {/* Page indicator */}
          <span>Page {page + 1} of {numPages}</span>
          <span style={{ color: 'var(--onyx-text-mute)', fontSize: 10 }}>({total} total)</span>

          {/* Prev / Next buttons */}
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              style={{
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid var(--onyx-glass-edge)',
                borderRadius: 6,
                color: page === 0 ? 'var(--onyx-text-mute)' : 'var(--onyx-text)',
                fontFamily: MONO,
                fontSize: 10,
                cursor: page === 0 ? 'default' : 'pointer',
                opacity: page === 0 ? 0.4 : 1,
              }}
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(numPages - 1, p + 1))}
              disabled={page >= numPages - 1}
              style={{
                padding: '5px 12px',
                background: 'transparent',
                border: '1px solid var(--onyx-glass-edge)',
                borderRadius: 6,
                color: page >= numPages - 1 ? 'var(--onyx-text-mute)' : 'var(--onyx-text)',
                fontFamily: MONO,
                fontSize: 10,
                cursor: page >= numPages - 1 ? 'default' : 'pointer',
                opacity: page >= numPages - 1 ? 0.4 : 1,
              }}
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ── Card 2: Open listening sessions ─────────────────────────────────── */}
      <div style={{ paddingTop: 24, borderTop: '1px solid var(--onyx-line)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
          <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500 }}>
            Open Listening Sessions
          </div>
          {/* Auto-refresh indicator */}
          <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--onyx-text-mute)', letterSpacing: '0.08em' }}>
            refreshes every 30s
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <TH>Item</TH>
                {isAdmin && <TH w={90}>User</TH>}
                <TH w={120}>Device</TH>
                <TH w={80}>Listened</TH>
                <TH w={80}>Position</TH>
                <TH w={80}>Updated</TH>
                {/* No delete in the open sessions panel — admins can delete via the history table */}
              </tr>
            </thead>
            <tbody>
              {openLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '18px 0', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>
                    Loading…
                  </td>
                </tr>
              ) : openSessions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ padding: '18px 0', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>
                    No open sessions detected in the last 5 minutes.
                  </td>
                </tr>
              ) : (
                openSessions.map(s => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    showUser={isAdmin}
                    showDelete={false} // no delete from the open sessions panel
                    onDelete={() => {}} // no-op — showDelete=false hides the button
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation dialog — rendered at the top level so it overlays everything */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete session?"
          message="This will permanently remove the session record from the server. This cannot be undone."
          confirmLabel={deletePending ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleDeleteConfirmed}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
