import { useState, useCallback } from 'react';
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
  onClose: () => void;
  onComplete: (updatedItem: LibraryItem) => void;
}

export default function MatchModal({ item, serverUrl, onClose, onComplete }: MatchModalProps) {
  const meta = item.media.metadata;

  const [provider, setProvider]       = useState('audible');
  const [queryTitle, setQueryTitle]   = useState(meta.title ?? '');
  const [queryAuthor, setQueryAuthor] = useState(bookAuthor(item));
  const [searching, setSearching]     = useState(false);
  const [searchErr, setSearchErr]     = useState<string | null>(null);
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [selected, setSelected]       = useState<SearchResult | null>(null);
  const [screen, setScreen]           = useState<'search' | 'review'>('search');
  const [submitting, setSubmitting]   = useState(false);
  const [checked, setChecked]         = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

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
      if (checked.language)    metadata.language      = editedValues.language;
      if (checked.isbn)        metadata.isbn          = editedValues.isbn;
      if (checked.asin)        metadata.asin          = editedValues.asin;
      if (checked.description) metadata.description   = editedValues.description;

      await updateMedia(serverUrl, item.id, metadata);
      const updated = await fetchItem(serverUrl, item.id);
      onComplete(updated);
    } catch (e) {
      console.error('[MatchModal] submit failed:', e);
    } finally {
      setSubmitting(false);
    }
  }, [serverUrl, item.id, selected, checked, editedValues, onComplete]);

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
  const curMeta = item.media.metadata;

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
        width: '100%', maxWidth: 900, maxHeight: '90vh',
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
            {/* Form */}
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

            {/* Results */}
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
            {/* Column header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '32px 96px 1fr 1fr', padding: '8px 24px 6px 16px', borderBottom: '1px solid var(--onyx-line)', flexShrink: 0 }}>
              <div />
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>Field</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--onyx-accent)', paddingRight: 16 }}>New Value</div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>Current</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* Cover */}
              {selected.cover && (
                <FieldRow label="Cover" checked={!!checked.cover} onToggle={() => toggleCheck('cover')}
                  newCol={<img src={selected.cover} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }} />}
                  curCol={<Cover item={item} size={56} serverUrl={serverUrl} />}
                />
              )}
              <EditableField label="Title"       fieldKey="title"       curVal={curMeta.title          ?? ''}      checked={!!checked.title}       onToggle={() => toggleCheck('title')}       value={editedValues.title       ?? ''} onChange={v => setField('title',       v)} />
              <EditableField label="Subtitle"    fieldKey="subtitle"    curVal={curMeta.subtitle       ?? ''}      checked={!!checked.subtitle}    onToggle={() => toggleCheck('subtitle')}    value={editedValues.subtitle    ?? ''} onChange={v => setField('subtitle',    v)} />
              <EditableField label="Author"      fieldKey="author"      curVal={bookAuthor(item)}                  checked={!!checked.author}      onToggle={() => toggleCheck('author')}      value={editedValues.author      ?? ''} onChange={v => setField('author',      v)} />
              <EditableField label="Narrator"    fieldKey="narrator"    curVal={curMeta.narratorName   ?? ''}      checked={!!checked.narrator}    onToggle={() => toggleCheck('narrator')}    value={editedValues.narrator    ?? ''} onChange={v => setField('narrator',    v)} />
              <EditableField label="Publisher"   fieldKey="publisher"   curVal={curMeta.publisher      ?? ''}      checked={!!checked.publisher}   onToggle={() => toggleCheck('publisher')}   value={editedValues.publisher   ?? ''} onChange={v => setField('publisher',   v)} />
              <EditableField label="Year"        fieldKey="year"        curVal={curMeta.publishedYear  ?? ''}      checked={!!checked.year}        onToggle={() => toggleCheck('year')}        value={editedValues.year        ?? ''} onChange={v => setField('year',        v)} />
              <EditableField label="Series"      fieldKey="seriesName"     curVal={curMeta.seriesName     ?? ''}      checked={!!checked.series}      onToggle={() => toggleCheck('series')}      value={editedValues.seriesName      ?? ''} onChange={v => setField('seriesName',      v)} />
              <EditableField label="Vol."        fieldKey="seriesSequence" curVal=""                                  checked={!!checked.series}      onToggle={() => toggleCheck('series')}      value={editedValues.seriesSequence  ?? ''} onChange={v => setField('seriesSequence',  v)} />
              <EditableField label="Genres"      fieldKey="genres"      curVal={(curMeta.genres ?? []).join(', ')} checked={!!checked.genres}      onToggle={() => toggleCheck('genres')}      value={editedValues.genres      ?? ''} onChange={v => setField('genres',      v)} />
              <EditableField label="Language"    fieldKey="language"    curVal={curMeta.language       ?? ''}      checked={!!checked.language}    onToggle={() => toggleCheck('language')}    value={editedValues.language    ?? ''} onChange={v => setField('language',    v)} />
              <EditableField label="ISBN"        fieldKey="isbn"        curVal={curMeta.isbn13 ?? curMeta.isbn10 ?? curMeta.isbn ?? ''} checked={!!checked.isbn} onToggle={() => toggleCheck('isbn')} value={editedValues.isbn ?? ''} onChange={v => setField('isbn', v)} />
              {selected.asin && <EditableField label="ASIN" fieldKey="asin" curVal="" checked={!!checked.asin} onToggle={() => toggleCheck('asin')} value={editedValues.asin ?? ''} onChange={v => setField('asin', v)} />}
              <EditableField label="Description" fieldKey="description" curVal={curMeta.description    ?? ''}      checked={!!checked.description} onToggle={() => toggleCheck('description')} value={editedValues.description ?? ''} onChange={v => setField('description', v)} multiline />
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

// ── Review row with image children ────────────────────────────────────────────

function FieldRow({ label, checked, onToggle, newCol, curCol }: {
  label: string; checked: boolean; onToggle: () => void;
  newCol: React.ReactNode; curCol: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr 1fr',
      alignItems: 'center', padding: '10px 24px 10px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)' }}>{label}</div>
      <div style={{ paddingRight: 16 }}>{newCol}</div>
      <div>{curCol}</div>
    </div>
  );
}

// ── Review row with editable input/textarea ───────────────────────────────────

function EditableField({ label, curVal, value, onChange, checked, onToggle, multiline }: {
  label: string; fieldKey: string;
  curVal: string; value: string; onChange: (v: string) => void;
  checked: boolean; onToggle: () => void; multiline?: boolean;
}) {
  if (!value && !curVal) return null;
  const differs = value !== curVal;

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '32px 96px 1fr 1fr',
      alignItems: multiline ? 'start' : 'center',
      padding: multiline ? '10px 24px 10px 16px' : '7px 24px 7px 16px',
      borderBottom: '1px solid var(--onyx-line)',
      borderLeft: checked && differs ? '3px solid var(--onyx-accent-edge)' : '3px solid transparent',
      opacity: !differs ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: multiline ? 8 : 0 }}>
        <input type="checkbox" checked={checked} onChange={onToggle} style={{ accentColor: 'var(--onyx-accent)', width: 14, height: 14, cursor: 'pointer' }} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--onyx-text-mute)', paddingTop: multiline ? 8 : 0 }}>{label}</div>
      <div style={{ paddingRight: 16 }}>
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
      <div style={{ fontSize: 12.5, color: 'var(--onyx-text-mute)', lineHeight: 1.4, overflow: 'hidden', ...(multiline ? {} : { whiteSpace: 'nowrap', textOverflow: 'ellipsis' }) }}>
        {curVal || '—'}
      </div>
    </div>
  );
}
