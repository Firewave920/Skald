import { useState, useRef, useEffect, useMemo } from 'react';
import type { OnyxState } from '../../state/onyx';
import { EMPTY_ADV_FILTER } from '../../lib/shelfFilters';

const MONO = "'JetBrains Mono', ui-monospace, monospace";

// ── Curated tag taxonomy ──────────────────────────────────────────────────────
// Real library tags have no inherent grouping, so each available tag is assigned
// to the first category (in PRIORITY order) whose keyword list it contains;
// anything unmatched falls to "Other". Categories render in DISPLAY order (which
// matches the design). Keyword match is a case-insensitive substring test.
const CAT_DEFS: Record<string, { label: string; kw: string[] }> = {
  fantasy:  { label: 'Fantasy & Sci-Fi',  kw: ['fantasy', 'sci-fi', 'science fiction', 'dragon', 'magic', 'sorcery', 'sword', 'epic', 'space', 'cyberpunk', 'steampunk', 'dystop', 'apocalyp', 'paranormal', 'supernatural', 'myth', 'litrpg', 'gamelit', 'wizard', 'vampire', 'superhero'] },
  mystery:  { label: 'Mystery & Thriller', kw: ['mystery', 'thriller', 'suspense', 'crime', 'detective', 'noir', 'spy', 'espionage', 'heist', 'horror'] },
  format:   { label: 'Format & Audio',     kw: ['audio', 'dramatiz', 'performance', 'antholog', 'short stor', 'full cast', 'abridged', 'collection', 'radio'] },
  themes:   { label: 'Themes & Era',       kw: ['historical', 'history', 'war', 'military', 'western', 'biograph', 'memoir', 'politic', 'classic', 'adventure', 'sea ', 'coming of age', 'religio', 'sports'] },
  literary: { label: 'Literary & General', kw: ['literary', 'fiction', 'contemporary', 'general', 'drama', 'humor', 'humour', 'romance', 'romantic', 'women', 'young adult', 'teen', 'children', 'nonfiction', 'non-fiction', 'self', 'business', 'poetry', 'essay'] },
};
// Assignment priority — Format/Themes resolve before the broad "Literary" bucket
// so e.g. "Historical Fiction" → Themes, "Audio Performances" → Format.
const CAT_PRIORITY = ['fantasy', 'mystery', 'format', 'themes', 'literary'];
// Display order (mirrors the design), with the catch-all last.
const CAT_DISPLAY = ['fantasy', 'mystery', 'literary', 'format', 'themes', 'other'];

function categorize(tag: string): string {
  const t = tag.toLowerCase();
  for (const key of CAT_PRIORITY) {
    if (CAT_DEFS[key].kw.some(k => t.includes(k))) return key;
  }
  return 'other';
}
function catLabel(c: string): string {
  return c === 'other' ? 'Other' : CAT_DEFS[c].label;
}

// A compact "Filters" button + popover for tag / language / explicit filtering.
// Options are derived client-side from the loaded library (st.library). The tag
// section groups chips into collapsible, searchable categories (accordion).
export default function FilterPopover({ st }: { st: OnyxState }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  // null = "use default (first non-empty)"; '' = explicitly all-collapsed.
  const [openCat, setOpenCat] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const f = st.advFilter;
  const allTags = useMemo(
    () => [...new Set(st.library.flatMap(b => b.media.tags ?? []))].sort((a, b) => a.localeCompare(b)),
    [st.library],
  );
  const allLangs = [...new Set(st.library.map(b => b.media.metadata.language).filter((l): l is string => !!l))].sort((a, b) => a.localeCompare(b));
  const activeCount = f.tags.length + (f.language ? 1 : 0) + (f.explicit !== 'all' ? 1 : 0);

  // Group the (search-filtered) tags by category.
  const q = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const tag of allTags) {
      if (q && !tag.toLowerCase().includes(q)) continue;
      const cat = categorize(tag);
      (g[cat] ||= []).push(tag);
    }
    return g;
  }, [allTags, q]);
  const visibleCats = CAT_DISPLAY.filter(c => (groups[c]?.length ?? 0) > 0);

  // Which category is expanded. When searching, expand everything so matches are
  // visible; otherwise it's an accordion defaulting to the first non-empty group.
  const activeOpen = openCat === ''
    ? null
    : (openCat && groups[openCat]?.length ? openCat : (visibleCats[0] ?? null));
  const isExpanded = (c: string) => q !== '' || c === activeOpen;
  const onHeader = (c: string) => setOpenCat(activeOpen === c ? '' : c);

  const toggleTag = (t: string) => st.setAdvFilter({
    ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t],
  });

  const lit = open || activeCount > 0;

  // ── small style helpers ──
  const chip = (tag: string) => {
    const active = f.tags.includes(tag);
    const prefix = active ? (f.tagMode === 'include' ? '+ ' : '− ') : '';
    return (
      <button key={tag} onClick={() => toggleTag(tag)} style={{
        fontFamily: MONO, fontSize: 10.5, padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
        background: active ? 'var(--onyx-accent-dim)' : 'transparent',
        border: `1px solid ${active ? 'var(--onyx-accent-edge)' : 'var(--onyx-glass-edge)'}`,
        color: active ? 'var(--onyx-accent)' : 'var(--onyx-text-dim)',
        whiteSpace: 'nowrap',
      }}>{prefix}{tag}</button>
    );
  };

  const head = (label: string) => (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)', margin: '14px 0 6px' }}>{label}</div>
  );

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
        fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
        background: lit ? 'var(--onyx-accent-dim)' : 'transparent',
        border: `1px solid ${lit ? 'var(--onyx-accent-edge)' : 'var(--onyx-glass-edge)'}`,
        color: lit ? 'var(--onyx-accent)' : 'var(--onyx-text-mute)',
      }}>
        Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 400, width: 290, maxHeight: '62vh', overflowY: 'auto',
          background: 'var(--onyx-panel2)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 10,
          boxShadow: '0 16px 44px rgba(0,0,0,0.6)', padding: '12px 14px 14px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-dim)' }}>Filter library</span>
            {activeCount > 0 && (
              <button onClick={() => { st.setAdvFilter(EMPTY_ADV_FILTER); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 10, color: 'var(--onyx-accent)' }}>Clear</button>
            )}
          </div>

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
            background: 'rgba(0,0,0,0.25)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 8,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--onyx-text-mute)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter tags…"
              style={{
                flex: 1, minWidth: 0, padding: '8px 0', background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--onyx-text)', fontFamily: MONO, fontSize: 11,
              }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--onyx-text-mute)', fontSize: 13, padding: 0, lineHeight: 1 }}>×</button>
            )}
          </div>

          {/* Include / Exclude segmented toggle */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10, padding: 3, background: 'var(--onyx-glass)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 8 }}>
            {(['include', 'exclude'] as const).map(m => {
              const on = f.tagMode === m;
              return (
                <button key={m} onClick={() => st.setAdvFilter({ ...f, tagMode: m })} style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, cursor: 'pointer',
                  fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                  background: on ? 'var(--onyx-accent-dim)' : 'transparent',
                  border: `1px solid ${on ? 'var(--onyx-accent-edge)' : 'transparent'}`,
                  color: on ? 'var(--onyx-accent)' : 'var(--onyx-text-mute)', fontWeight: on ? 600 : 400,
                }}>{m}</button>
              );
            })}
          </div>

          {/* Grouped, collapsible tag categories */}
          {visibleCats.length > 0 ? (
            <div style={{ marginTop: 6 }}>
              {visibleCats.map(c => {
                const tags = groups[c] ?? [];
                const expanded = isExpanded(c);
                const hasSel = tags.some(t => f.tags.includes(t));
                return (
                  <div key={c} style={{ borderTop: '1px solid var(--onyx-line)' }}>
                    <button onClick={() => onHeader(c)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 2px',
                      background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}>
                      {/* chevron */}
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--onyx-text-mute)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                        style={{ flexShrink: 0, transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.12s' }}>
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                      <span style={{
                        flex: 1, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: hasSel ? 'var(--onyx-accent)' : 'var(--onyx-text-dim)', fontWeight: hasSel ? 600 : 400,
                      }}>{catLabel(c)}</span>
                      <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)' }}>{tags.length}</span>
                    </button>
                    {expanded && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 2px 12px' }}>
                        {tags.map(chip)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : allTags.length > 0 ? (
            <div style={{ fontFamily: MONO, fontSize: 10.5, color: 'var(--onyx-text-mute)', padding: '16px 2px' }}>
              No tags match “{search}”.
            </div>
          ) : null}

          {/* Language */}
          {allLangs.length > 0 && (
            <>
              {head('Language')}
              <select value={f.language} onChange={e => st.setAdvFilter({ ...f, language: e.target.value })} style={{
                width: '100%', fontFamily: MONO, fontSize: 11, background: 'var(--onyx-panel2)', color: 'var(--onyx-text)',
                border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
              }}>
                <option value="">Any language</option>
                {allLangs.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </>
          )}

          {/* Explicit */}
          {head('Explicit content')}
          <div style={{ display: 'flex', gap: 5 }}>
            {([['all', 'All'], ['clean', 'Clean'], ['explicit', 'Explicit']] as const).map(([v, l]) => {
              const on = f.explicit === v;
              return (
                <button key={v} onClick={() => st.setAdvFilter({ ...f, explicit: v })} style={{
                  fontFamily: MONO, fontSize: 10.5, padding: '4px 9px', borderRadius: 6, cursor: 'pointer',
                  background: on ? 'var(--onyx-accent-dim)' : 'transparent',
                  border: `1px solid ${on ? 'var(--onyx-accent-edge)' : 'var(--onyx-glass-edge)'}`,
                  color: on ? 'var(--onyx-accent)' : 'var(--onyx-text-dim)',
                }}>{l}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
