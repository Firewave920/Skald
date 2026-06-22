// Skald · Metadata Match — shared tokens, data model, and UI atoms.
// All three option screens import from here. Exported to window at the bottom.

const ONYX = {
  bg: '#0b0b0e', bgDeep: '#08080b', panel: '#131319', panel2: '#1a1a22',
  line: 'rgba(255,255,255,0.06)', lineStrong: 'rgba(255,255,255,0.12)',
  text: '#ebe7df', textDim: 'rgba(235,231,223,0.62)', textMute: 'rgba(235,231,223,0.38)',
  accent: '#d4a64a', accentBright: '#e9bb5e', accentDeep: '#a37d2e',
  accentDim: 'rgba(212,166,74,0.18)', accentEdge: 'rgba(212,166,74,0.35)',
  glass: 'rgba(255,255,255,0.04)', glassStrong: 'rgba(255,255,255,0.07)', glassEdge: 'rgba(255,255,255,0.09)',
  add: '#5ac88a', addDim: 'rgba(90,200,138,0.14)', addEdge: 'rgba(90,200,138,0.32)',
  sans: '"Inter", -apple-system, system-ui, sans-serif',
  serif: '"Source Serif Pro", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
};

// ── The match payload ───────────────────────────────────────────────
// A local audiobook ("Sufficiently Advanced Magic") matched against an
// Audible source. `current` = what Skald has now, `incoming` = the source.
// status is derived: added (was empty), changed (differs), same (identical).
const MATCH_SOURCE = { name: 'Audible.com', asin: 'B072YT93QD', confidence: 0.97 };

const RAW_FIELDS = [
  { key: 'cover', label: 'Cover', type: 'cover',
    current: { res: '600 × 600', tpl: 'sam-old' }, incoming: { res: '2400 × 2400', tpl: 'sam-new' } },
  { key: 'title', label: 'Title', type: 'text',
    current: 'Sufficiently Advanced Magic', incoming: 'Sufficiently Advanced Magic' },
  { key: 'subtitle', label: 'Subtitle', type: 'text',
    current: '', incoming: 'Arcane Ascension, Book 1' },
  { key: 'author', label: 'Author', type: 'text',
    current: 'Andrew Rowe', incoming: 'Andrew Rowe' },
  { key: 'narrator', label: 'Narrator', type: 'text',
    current: '', incoming: 'Nick Podehl' },
  { key: 'series', label: 'Series', type: 'text',
    current: 'Arcane Ascension', incoming: 'Arcane Ascension #1' },
  { key: 'publisher', label: 'Publisher', type: 'text',
    current: '', incoming: 'Podium Audio' },
  { key: 'year', label: 'Year', type: 'text',
    current: '2018', incoming: '2017' },
  { key: 'genres', label: 'Genres', type: 'chips',
    current: ['Science Fiction & Fantasy'], incoming: ['Science Fiction & Fantasy'] },
  { key: 'tags', label: 'Tags', type: 'chips',
    current: ['Fantasy'], incoming: ['Fantasy', 'Epic', 'Progression'] },
  { key: 'language', label: 'Language', type: 'text',
    current: 'English', incoming: 'English' },
  { key: 'isbn', label: 'ISBN', type: 'mono',
    current: '', incoming: '9781772303322' },
  { key: 'asin', label: 'ASIN', type: 'mono',
    current: '', incoming: 'B072YT93QD' },
  { key: 'description', label: 'Description', type: 'longtext',
    current: "Corin Cadence's brother went into the Serpent Spire and never came back.",
    incoming: "Five years ago, Corin Cadence's brother entered the Serpent Spire — a colossal tower with ever-shifting rooms, traps, and monsters. Those who survive the spire's trials return home with an attunement: a mark granting the bearer magical powers. According to legend, those few who reach the top will be granted a boon by the spire's goddess. He just wants to find his missing brother, but to do that he'll have to climb a tower built to kill him." },
];

function fieldStatus(f) {
  const norm = (v) => Array.isArray(v) ? v.join('\u0000') : (v || '').toString().trim();
  if (f.type === 'cover') return 'changed';
  const c = norm(f.current), i = norm(f.incoming);
  if (c === i) return 'same';
  if (!c) return 'added';
  return 'changed';
}

const FIELDS = RAW_FIELDS.map(f => ({ ...f, status: fieldStatus(f) }));
const CHANGED_FIELDS = FIELDS.filter(f => f.status !== 'same');
const SAME_FIELDS = FIELDS.filter(f => f.status === 'same');

// ── Mini cover — typographic placeholder, square (audiobook art). ───
// Two looks: the dim "old" local art and the crisp "new" source art.
function MiniCover({ variant = 'sam-new', size = 64, radius = 4 }) {
  const isNew = variant === 'sam-new';
  const bg = isNew ? '#243244' : '#2c2c34';
  const accent = isNew ? '#e8ddc8' : '#8a8a92';
  const mid = isNew ? '#5e7c98' : '#43434c';
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, position: 'relative', overflow: 'hidden',
      background: `linear-gradient(150deg, ${bg}, ${mid})`, flexShrink: 0,
      boxShadow: isNew ? '0 2px 10px rgba(0,0,0,.45)' : '0 1px 4px rgba(0,0,0,.3)',
      fontFamily: ONYX.serif,
    }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: size * 0.1, textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.155, lineHeight: 1.05, fontWeight: 700, color: accent,
          letterSpacing: '0.01em', textShadow: '0 1px 3px rgba(0,0,0,.4)' }}>SUFFICIENTLY ADVANCED</div>
        <div style={{ width: size * 0.34, height: 1, background: accent, opacity: 0.5, margin: `${size * 0.05}px 0` }} />
        <div style={{ fontSize: size * 0.135, fontWeight: 600, color: accent, opacity: 0.92 }}>MAGIC</div>
      </div>
      {/* corner band like the Audible flag in the references */}
      <div style={{ position: 'absolute', bottom: 0, right: 0, width: size * 0.42, height: size * 0.42,
        background: isNew ? ONYX.accent : '#55555e',
        clipPath: 'polygon(100% 0, 100% 100%, 0 100%)', opacity: 0.9 }} />
      <div style={{ position: 'absolute', bottom: size * 0.04, right: size * 0.03, fontSize: size * 0.085,
        fontFamily: ONYX.mono, color: '#1a1206', fontWeight: 700, transform: 'rotate(-45deg)',
        transformOrigin: 'center', letterSpacing: '0.05em' }}>{isNew ? 'NEW' : 'OLD'}</div>
    </div>
  );
}

// ── Status tag — tiny mono pill. ────────────────────────────────────
function StatusTag({ status, style }) {
  const map = {
    added:   { t: 'NEW',     c: ONYX.add,    bg: ONYX.addDim,    e: ONYX.addEdge },
    changed: { t: 'CHANGED', c: ONYX.accent, bg: ONYX.accentDim, e: ONYX.accentEdge },
    edited:  { t: 'EDITED',  c: ONYX.text,   bg: ONYX.glassStrong, e: ONYX.lineStrong },
    same:    { t: 'MATCH',   c: ONYX.textMute, bg: 'transparent', e: ONYX.line },
  };
  const m = map[status] || map.same;
  return (
    <span style={{ fontFamily: ONYX.mono, fontSize: 8.5, letterSpacing: '0.13em', color: m.c,
      background: m.bg, border: `1px solid ${m.e}`, borderRadius: 3, padding: '1.5px 5px',
      lineHeight: 1, whiteSpace: 'nowrap', ...style }}>{m.t}</span>
  );
}

// ── Checkbox — square, gold when on (matches the current implementation). ──
function Check({ on, onClick, size = 17, accent = ONYX.accent }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{
      width: size, height: size, borderRadius: 4, flexShrink: 0, cursor: 'pointer', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: on ? accent : 'transparent',
      border: `1.5px solid ${on ? accent : ONYX.lineStrong}`,
      transition: 'background .12s, border-color .12s',
    }}>
      {on && (
        <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 16 16">
          <path d="M3 8 L7 12 L13 4" fill="none" stroke={ONYX.bg} strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

// Glyph for the close / back / chevron controls (stroke, crisp at any zoom).
function Glyph({ name, size = 16, color = 'currentColor', sw = 1.6 }) {
  const s = { width: size, height: size, display: 'block', flexShrink: 0 };
  const p = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'close':   return <svg style={s} viewBox="0 0 16 16"><path d="M4 4 L12 12 M12 4 L4 12" {...p} /></svg>;
    case 'back':    return <svg style={s} viewBox="0 0 16 16"><path d="M9 3 L4 8 L9 13 M4 8 L13 8" {...p} /></svg>;
    case 'left':    return <svg style={s} viewBox="0 0 16 16"><path d="M10 3 L5 8 L10 13" {...p} strokeWidth={sw + 0.2} /></svg>;
    case 'right':   return <svg style={s} viewBox="0 0 16 16"><path d="M6 3 L11 8 L6 13" {...p} strokeWidth={sw + 0.2} /></svg>;
    case 'down':    return <svg style={s} viewBox="0 0 16 16"><path d="M3 6 L8 11 L13 6" {...p} /></svg>;
    case 'check':   return <svg style={s} viewBox="0 0 16 16"><path d="M3 8 L7 12 L13 4" {...p} strokeWidth={sw + 0.3} /></svg>;
    case 'arrow':   return <svg style={s} viewBox="0 0 16 16"><path d="M3 8 L13 8 M9 4 L13 8 L9 12" {...p} /></svg>;
    case 'revert':  return <svg style={s} viewBox="0 0 16 16"><path d="M6 3 L3 6 L6 9 M3 6 L11 6 Q13 6 13 9 L13 13" {...p} /></svg>;
    case 'edit':    return <svg style={s} viewBox="0 0 16 16"><path d="M11 2.5 L13.5 5 L6 12.5 L3 13 L3.5 10 Z" {...p} /></svg>;
    case 'sparkle': return <svg style={s} viewBox="0 0 16 16"><path d="M8 2 L9.2 6.2 L13 8 L9.2 9.8 L8 14 L6.8 9.8 L3 8 L6.8 6.2 Z" fill={color} stroke="none" /></svg>;
    case 'bolt':    return <svg style={s} viewBox="0 0 16 16"><path d="M9 2 L4 9 L7.5 9 L7 14 L12 7 L8.5 7 Z" fill={color} stroke="none" /></svg>;
    default: return null;
  }
}

Object.assign(window, {
  ONYX, MATCH_SOURCE, FIELDS, CHANGED_FIELDS, SAME_FIELDS,
  MiniCover, StatusTag, Check, Glyph,
});
