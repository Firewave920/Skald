import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import type { LibraryItem } from '../state/onyx';
import { bookAuthor } from '../state/onyx';
import { searchBooks, updateMedia, fetchItem } from '../api/abs';
import Cover from './Cover';

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO  = "'JetBrains Mono', ui-monospace, monospace";

const PROVIDERS = [
  { label: 'Audible.com',  value: 'audible'    },
  { label: 'Google Books', value: 'google'      },
  { label: 'iTunes',       value: 'itunes'      },
  { label: 'Open Library', value: 'openlibrary' },
  { label: 'FantLab.ru',   value: 'fantlab'     },
];

interface SearchResult {
  title?: string;
  subtitle?: string;
  author?: string;
  narrator?: string;
  publisher?: string;
  publishedYear?: string;
  description?: string;
  cover?: string;
  series?: string | { name?: string; sequence?: string }[];
  genres?: string[];
  tags?: string[];
  language?: string;
  isbn?: string;
  asin?: string;
  confidence?: number;
}

function seriesStr(s: SearchResult['series']): string {
  if (!s) return '';
  if (typeof s === 'string') return s;
  return s.map(x => [x.name, x.sequence].filter(Boolean).join(' #')).join(', ');
}

function ConfBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const color = score >= 90 ? 'var(--onyx-accent)' : score >= 70 ? '#e8b74a' : 'var(--onyx-text-mute)';
  return (
    <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', color, border: `1px solid ${color}`, borderRadius: 4, padding: '1px 5px' }}>
      {score}%
    </span>
  );
}

export interface MatchModalProps {
  item: LibraryItem;
  serverUrl: string;
  library: LibraryItem[];
  onClose: () => void;
  onComplete: (updatedItem: LibraryItem) => void;
  onRefresh: () => void;
}

export default function MatchModal({ item, serverUrl, library, onClose, onComplete, onRefresh }: MatchModalProps) {
  const meta = item.media.metadata;

  const [provider, setProvider]         = useState('audible');
  const [queryTitle, setQueryTitle]     = useState(meta.title ?? '');
  const [queryAuthor, setQueryAuthor]   = useState(bookAuthor(item));
  const [searching, setSearching]       = useState(false);
  const [searchErr, setSearchErr]       = useState<string | null>(null);
  const [results, setResults]           = useState<SearchResult[]>([]);
  const [selected, setSelected]         = useState<SearchResult | null>(null);
  const [screen, setScreen]             = useState<'search' | 'review'>('search');
  const [submitting, setSubmitting]     = useState(false);
  const [checked, setChecked]           = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  // ── Autocomplete sources derived from the library ─────────────────────────

  const seriesOptions = useMemo(() => {
    const names = new Set<string>();
    for (const b of library) {
      const s = b.media.metadata.seriesName;
      if (s) {
        // Strip trailing " #N" or " · N" volume suffix
        const name = s.replace(/\s*[#·]\s*[\d.]+$/, '').trim();
        if (name) names.add(name);
      }
    }
    return Array.from(names).sort();
  }, [library]);

  const genreOptions = useMemo(() => {
    const names = new Set<string>();
    for (const b of library) {
      for (const g of b.media.metadata.genres ?? []) {
        if (g) names.add(g);
      }
    }
    return Array.from(names).sort();
  }, [library]);

  const tagOptions = useMemo(() => {
    const names = new Set<string>();
    for (const b of library) {
      for (const t of b.media.tags ?? []) {
        if (t) names.add(t);
      }
    }
    return Array.from(names).sort();
  }, [library]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    setSearching(true);
    setSearchErr(null);
    try {
      const raw = await searchBooks(serverUrl, queryTitle, queryAuthor, provider);
      const arr = Array.isArray(raw)
        ? raw
        : ((raw as Record<string, unknown>)?.results as SearchResult[] ?? []);
      setResults(arr as SearchResult[]);
    } catch (e) {
      setSearchErr(String(e));
    } finally {
      setSearching(false);
    }
  }, [serverUrl, queryTitle, queryAuthor, provider]);

  const handleSelect = useCallback((result: SearchResult) => {
    setSelected(result);

    const cur = item.media.metadata;
    const curAuthor = bookAuthor(item);
    const differs = (nv: string, cv: string) => !!nv && nv !== cv;

    const seriesObj = Array.isArray(result.series) ? result.series[0] : null;
    const seriesName = seriesObj?.name ?? (typeof result.series === 'string' ? result.series : '');
    const seriesSequence = seriesObj?.sequence ?? '';

    const ev: Record<string, string> = {
      title:          result.title         ?? '',
      subtitle:       result.subtitle      ?? '',
      author:         result.author        ?? '',
      narrator:       result.narrator      ?? '',
      publisher:      result.publisher     ?? '',
      year:           result.publishedYear ?? '',
      seriesName,
      seriesSequence,
      genres:         (result.genres ?? []).join(', '),
      tags:           (result.tags   ?? []).join(', '),
      language:       result.language      ?? '',
      isbn:           result.isbn          ?? '',
      asin:           result.asin          ?? '',
      description:    result.description  ?? '',
    };
    setEditedValues(ev);

    setChecked({
      cover:       !!(result.cover),
      title:       differs(ev.title,       cur.title          ?? ''),
      subtitle:    differs(ev.subtitle,    cur.subtitle       ?? ''),
      author:      differs(ev.author,      curAuthor),
      narrator:    differs(ev.narrator,    cur.narratorName   ?? ''),
      publisher:   differs(ev.publisher,   cur.publisher      ?? ''),
      year:        differs(ev.year,        cur.publishedYear  ?? ''),
      series:      differs(ev.seriesName,  cur.seriesName     ?? '') || !!ev.seriesSequence,
      genres:      !!(result.genres?.length),
      tags:        !!(result.tags?.length),
      language:    differs(ev.language,    cur.language       ?? ''),
      isbn:        differs(ev.isbn,        cur.isbn13 ?? cur.isbn10 ?? cur.isbn ?? ''),
      asin:        !!(result.asin),
      description: differs(ev.description, cur.description    ?? ''),
    });

    setScreen('review');
  }, [item]);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const metadata: Record<string, unknown> = {};
      if (checked.title)       metadata.title         = editedValues.title;
      if (checked.subtitle)    metadata.subtitle      = editedValues.subtitle;
      if (checked.author)      metadata.authors       = editedValues.author.split(',').map(n => ({ name: n.trim() })).filter(o => o.name);
      if (checked.narrator)    metadata.narrators     = editedValues.narrator.split(',').map(n => n.trim()).filter(Boolean);
      if (checked.publisher)   metadata.publisher     = editedValues.publisher;
      if (checked.year)        metadata.publishedYear = editedValues.year;
      if (checked.series)      metadata.series        = [{ name: editedValues.seriesName, sequence: editedValues.seriesSequence }];
      if (checked.genres)      metadata.genres        = editedValues.genres.split(',').map(g => g.trim()).filter(Boolean);
      if (checked.tags)        metadata.tags          = editedValues.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (checked.language)    metadata.language      = editedValues.language;
      if (checked.isbn)        metadata.isbn          = editedValues.isbn;
      if (checked.asin)        metadata.asin          = editedValues.asin;
      if (checked.description) metadata.description   = editedValues.description;

      await updateMedia(serverUrl, item.id, metadata);
      const updated = await fetchItem(serverUrl, item.id);
      onComplete(updated);
      onRefresh();
    } catch (e) {
      console.error('[MatchModal] submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  }, [serverUrl, item.id, selected, checked, editedValues, onComplete, onRefresh]);

  const toggleCheck = (key: string) => setChecked(c => ({ ...c, [key]: !c[key] }));
  const setField = (key: string, v: string) => setEditedValues(c => ({ ...c, [key]: v }));

  const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: 'rgba(0,0,0,0.35)', borderRadius: 8,
    color: 'var(--onyx-text)', border: '1px solid var(--onyx-glass-edge)',
    outline: 'none', fontFamily: 'inherit', fontSize: 13,
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--onyx-text-mute)',
    marginBottom: 5,
  };

  const providerLabel = PROVIDERS.find(p => p.value === provider)?.label ?? provider;

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 720, maxHeight: '90vh',
        background: 'var(--onyx-panel2)', border: '1px solid var(--onyx-line)',
        borderRadius: 14, boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{ padding: '18px 24px 16px', borderBottom: '1px solid var(--onyx-line)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {screen === 'review' && (
            <button onClick={() => setScreen('search')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--onyx-text-dim)', padding: '4px 8px 4px 0', fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              ← Back
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 500 }}>
              {screen === 'search' ? 'Match Book' : 'Review Changes'}
            </div>
            {screen === 'review' && (
              <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', letterSpacing: '0.06em', marginTop: 2 }}>
                via {providerLabel}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--onyx-text-mute)', fontSize: 18, lineHeight: 1, padding: 4, flexShrink: 0 }}>✕</button>
        </div>

        {/* ── Search screen ──────────────────────────────────────── */}
        {screen === 'search' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--onyx-line)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', flexShrink: 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 140 }}>
                <div style={labelStyle}>Provider</div>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {PROVIDERS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 160 }}>
                <div style={labelStyle}>Title / ASIN</div>
                <input value={queryTitle} onChange={e => setQueryTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Title or ASIN…" style={{ ...inputStyle }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 140 }}>
                <div style={labelStyle}>Author</div>
                <input value={queryAuthor} onChange={e => setQueryAuthor(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder="Author…" style={{ ...inputStyle }} />
              </div>
              <button onClick={handleSearch} disabled={searching} style={{ padding: '8px 20px', borderRadius: 8, cursor: searching ? 'default' : 'pointer', background: 'var(--onyx-accent)', border: 'none', color: 'var(--onyx-bg)', fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', fontWeight: 600, opacity: searching ? 0.6 : 1 }}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {searchErr && <div style={{ padding: '24px', color: '#e87c7c', fontFamily: MONO, fontSize: 11 }}>{searchErr}</div>}
              {!searching && !searchErr && results.length === 0 && (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--onyx-text-mute)', fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em' }}>
                  {queryTitle ? 'No results found.' : 'Enter a title and click Search.'}
                </div>
              )}
              {results.map((r, i) => (
                <button key={i} onClick={() => handleSelect(r)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 14, width: '100%', padding: '12px 24px', background: 'none', border: 'none', borderBottom: '1px solid var(--onyx-line)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: 'inherit', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {r.cover
                    ? <img src={r.cover} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                    : <div style={{ width: 48, height: 48, borderRadius: 4, background: 'var(--onyx-glass)', flexShrink: 0 }} />
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: SERIF, fontSize: 14.5, fontWeight: 500, color: 'var(--onyx-text)' }}>{r.title}</span>
                      {r.publishedYear && <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)' }}>{r.publishedYear}</span>}
                      <ConfBadge score={r.confidence} />
                    </div>
                    {r.author   && <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--onyx-text-dim)' }}>{r.author}</div>}
                    {r.narrator && <div style={{ marginTop: 1, fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', letterSpacing: '0.04em' }}>Narr. {r.narrator}</div>}
                    {r.series   && <div style={{ marginTop: 1, fontFamily: MONO, fontSize: 10, color: 'var(--onyx-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{seriesStr(r.series)}</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Review screen ──────────────────────────────────────── */}
        {screen === 'review' && selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Column header */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 96px 1fr', padding: '8px 24px 6px 16px', borderBottom: '1px solid var(--onyx-line)', flexShrink: 0 }}>
              <div />
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>Field</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--onyx-accent)' }}>New Value</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Cover */}
              {selected.cover && (
                <CoverRow label="Cover" checked={!!checked.cover} onToggle={() => toggleCheck('cover')}
                  cover={selected.cover} item={item} serverUrl={serverUrl}
                />
              )}
              <EditableField label="Title"       checked={!!checked.title}       onToggle={() => toggleCheck('title')}       value={editedValues.title       ?? ''} onChange={v => setField('title',       v)} />
              <EditableField label="Subtitle"    checked={!!checked.subtitle}    onToggle={() => toggleCheck('subtitle')}    value={editedValues.subtitle    ?? ''} onChange={v => setField('subtitle',    v)} />
              <EditableField label="Author"      checked={!!checked.author}      onToggle={() => toggleCheck('author')}      value={editedValues.author      ?? ''} onChange={v => setField('author',      v)} />
              <EditableField label="Narrator"    checked={!!checked.narrator}    onToggle={() => toggleCheck('narrator')}    value={editedValues.narrator    ?? ''} onChange={v => setField('narrator',    v)} />
              <EditableField label="Publisher"   checked={!!checked.publisher}   onToggle={() => toggleCheck('publisher')}   value={editedValues.publisher   ?? ''} onChange={v => setField('publisher',   v)} />
              <EditableField label="Year"        checked={!!checked.year}        onToggle={() => toggleCheck('year')}        value={editedValues.year        ?? ''} onChange={v => setField('year',        v)} />
              <SeriesAutocompleteField
                label="Series" checked={!!checked.series} onToggle={() => toggleCheck('series')}
                value={editedValues.seriesName ?? ''} onChange={v => setField('seriesName', v)}
                options={seriesOptions}
              />
              <EditableField label="Vol."        checked={!!checked.series}      onToggle={() => toggleCheck('series')}      value={editedValues.seriesSequence ?? ''} onChange={v => setField('seriesSequence', v)} />
              <PillTagField
                label="Genres" checked={!!checked.genres} onToggle={() => toggleCheck('genres')}
                value={editedValues.genres ?? ''} onChange={v => setField('genres', v)}
                options={genreOptions}
              />
              <PillTagField
                label="Tags" checked={!!checked.tags} onToggle={() => toggleCheck('tags')}
                value={editedValues.tags ?? ''} onChange={v => setField('tags', v)}
                options={tagOptions}
              />
              <EditableField label="Language"    checked={!!checked.language}    onToggle={() => toggleCheck('language')}    value={editedValues.language    ?? ''} onChange={v => setField('language',    v)} />
              <EditableField label="ISBN"        checked={!!checked.isbn}        onToggle={() => toggleCheck('isbn')}        value={editedValues.isbn        ?? ''} onChange={v => setField('isbn',        v)} />
              {selected.asin && <EditableField label="ASIN" checked={!!checked.asin} onToggle={() => toggleCheck('asin')} value={editedValues.asin ?? ''} onChange={v => setField('asin', v)} />}
              <EditableField label="Description" checked={!!checked.description} onToggle={() => toggleCheck('description')} value={editedValues.description ?? ''} onChange={v => setField('description', v)} multiline />
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--onyx-line)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
              <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, background: 'transparent', border: '1px solid var(--onyx-glass-edge)', color: 'var(--onyx-text-dim)', fontFamily: MONO, fontSize: 11, cursor: 'pointer', letterSpacing: '0.06em' }}>
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} style={{ padding: '8px 22px', borderRadius: 8, cursor: submitting ? 'default' : 'pointer', background: 'var(--onyx-accent)', border: 'none', color: 'var(--onyx-bg)', fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', fontWeight: 600, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Applying…' : 'Apply Selected Fields'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}

// ── Cover row (image-only, no current column) ─────────────────────────────────

function CoverRow({ label, checked, onToggle, cover, item, serverUrl }: {
  label: string; checked: boolean; onToggle: () => void;
  cover: string; item: LibraryItem; serverUrl: string;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr',
      alignItems: 'center', padding: '10px 24px 10px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={cover} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} />
        <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--onyx-text-mute)', letterSpacing: '0.06em' }}>→</span>
        <Cover item={item} size={56} serverUrl={serverUrl} />
      </div>
    </div>
  );
}

// ── Plain editable field (no current column) ──────────────────────────────────

function EditableField({ label, value, onChange, checked, onToggle, multiline }: {
  label: string;
  value: string; onChange: (v: string) => void;
  checked: boolean; onToggle: () => void; multiline?: boolean;
}) {
  if (!value) return null;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr',
      alignItems: multiline ? 'start' : 'center',
      padding: multiline ? '10px 24px 10px 16px' : '7px 24px 7px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: multiline ? 8 : 0 }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)', paddingTop: multiline ? 8 : 0 }}>{label}</div>
      <div>
        {multiline ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={4}
            style={{ width: '100%', resize: 'vertical', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, color: 'var(--onyx-text)', fontFamily: 'inherit', fontSize: 12, padding: '6px 10px', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }}
          />
        ) : (
          <input value={value} onChange={e => onChange(e.target.value)}
            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, color: 'var(--onyx-text)', fontFamily: 'inherit', fontSize: 12.5, padding: '5px 10px', outline: 'none', boxSizing: 'border-box' }}
          />
        )}
      </div>
    </div>
  );
}

// ── Series field with autocomplete dropdown ───────────────────────────────────

function SeriesAutocompleteField({ label, value, onChange, checked, onToggle, options }: {
  label: string; value: string; onChange: (v: string) => void;
  checked: boolean; onToggle: () => void; options: string[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() =>
    value.length > 0
      ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
      : options,
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr',
      alignItems: 'center', padding: '7px 24px 7px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>{label}</div>
      <div ref={containerRef} style={{ position: 'relative' }}>
        <input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Series name…"
          style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, color: 'var(--onyx-text)', fontFamily: 'inherit', fontSize: 12.5, padding: '5px 10px', outline: 'none', boxSizing: 'border-box' }}
        />
        {open && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--onyx-panel2)', border: '1px solid var(--onyx-line)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
            {filtered.map(opt => (
              <button key={opt}
                onMouseDown={e => { e.preventDefault(); onChange(opt); setOpen(false); }}
                style={{ display: 'block', width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--onyx-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Multi-select pill field for genres and tags ───────────────────────────────

function PillTagField({ label, value, onChange, checked, onToggle, options }: {
  label: string; value: string; onChange: (v: string) => void;
  checked: boolean; onToggle: () => void; options: string[];
}) {
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const pills = useMemo(() =>
    value.split(',').map(v => v.trim()).filter(Boolean),
    [value],
  );

  const filtered = useMemo(() => {
    const q = inputText.toLowerCase();
    return options.filter(o =>
      !pills.includes(o) &&
      (q.length === 0 || o.toLowerCase().includes(q)),
    );
  }, [options, pills, inputText]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const addPill = (tag: string) => {
    const t = tag.trim();
    if (!t || pills.includes(t)) return;
    onChange([...pills, t].join(', '));
    setInputText('');
    setOpen(false);
  };

  const removePill = (tag: string) => {
    onChange(pills.filter(p => p !== tag).join(', '));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputText.trim()) {
      e.preventDefault();
      addPill(inputText);
    } else if (e.key === 'Backspace' && !inputText && pills.length > 0) {
      removePill(pills[pills.length - 1]);
    }
  };

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr',
      alignItems: 'start', padding: '7px 24px 7px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)', paddingTop: 8 }}>{label}</div>
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '4px 6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--onyx-glass-edge)', borderRadius: 6, cursor: 'text', minHeight: 34 }}
          onClick={() => containerRef.current?.querySelector('input')?.focus()}
        >
          {pills.map(p => (
            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--onyx-accent-dim)', border: '1px solid var(--onyx-accent-edge)', borderRadius: 999, fontFamily: MONO, fontSize: 10, color: 'var(--onyx-accent)', letterSpacing: '0.04em' }}>
              {p}
              <button
                onMouseDown={e => { e.preventDefault(); removePill(p); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--onyx-accent)', padding: 0, fontSize: 12, lineHeight: 1, display: 'flex', alignItems: 'center' }}
              >×</button>
            </span>
          ))}
          <input
            value={inputText}
            onChange={e => { setInputText(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={pills.length === 0 ? 'Add tags…' : ''}
            style={{ flex: 1, minWidth: 80, background: 'none', border: 'none', outline: 'none', color: 'var(--onyx-text)', fontFamily: 'inherit', fontSize: 12.5, padding: '2px 4px' }}
          />
        </div>
        {open && filtered.length > 0 && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--onyx-panel2)', border: '1px solid var(--onyx-line)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
            {filtered.map(opt => (
              <button key={opt}
                onMouseDown={e => { e.preventDefault(); addPill(opt); }}
                style={{ display: 'block', width: '100%', padding: '7px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5, color: 'var(--onyx-text)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
