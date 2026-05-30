import { useState, useEffect } from 'react';
import type { OnyxState, LibraryItem } from '../../../state/onyx';
import { bookTitle, bookAuthor } from '../../../state/onyx';
import { getCollections } from '../../../api/abs';
import type { Collection } from '../../../api/abs';
import BrowseView, { posterTile } from '../BrowseView';
import BrowseList from '../BrowseList';
import CoverMosaic from '../CoverMosaic';
import Cover from '../../Cover';

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO = "'JetBrains Mono', ui-monospace, monospace";

function groupMatchesFilter(books: LibraryItem[], st: OnyxState): boolean {
  if (st.filter === 'all') return true;
  if (st.filter === 'reading')  return books.some(b  => { const p = st.mediaProgress.find(x => x.libraryItemId === b.id);  return Boolean(p && p.progress > 0 && !p.isFinished); });
  if (st.filter === 'unread')   return books.some(b  => { const p = st.mediaProgress.find(x => x.libraryItemId === b.id);  return !p || p.progress === 0; });
  if (st.filter === 'finished') return books.every(b => { const p = st.mediaProgress.find(x => x.libraryItemId === b.id);  return p?.isFinished === true; });
  return true;
}

export interface CollectionsViewProps {
  st: OnyxState;
  inline?: boolean;
}

export default function CollectionsView({ st, inline = false }: CollectionsViewProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  // Derive the library ID from the first loaded book — same library as the shelf.
  const libraryId = st.library[0]?.libraryId ?? '';

  useEffect(() => {
    if (!libraryId || !st.serverUrl) { setLoading(false); return; }
    setLoading(true);
    getCollections(st.serverUrl, libraryId)
      .then(result => { setCollections(result); setLoading(false); })
      .catch(() => setLoading(false));
  }, [st.serverUrl, libraryId]);

  const booksFor = (c: Collection): LibraryItem[] =>
    (c.books ?? [])
      .map(cb => st.library.find(b => b.id === cb.id))
      .filter((b): b is LibraryItem => Boolean(b));

  let filtered = collections.slice();

  if (st.search) {
    const q = st.search.toLowerCase();
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.description ?? '').toLowerCase().includes(q) ||
      (c.books ?? []).some(cb => {
        const b = st.library.find(x => x.id === cb.id);
        return b && (bookTitle(b).toLowerCase().includes(q) || bookAuthor(b).toLowerCase().includes(q));
      }),
    );
  }

  if (st.filter !== 'all') {
    filtered = filtered.filter(c => groupMatchesFilter(booksFor(c), st));
  }

  const openCollection = (c: Collection) => {
    st.setContextFilter({
      kind: 'collection',
      value: c.name,
      bookIds: (c.books ?? []).map(b => b.id),
    });
    st.setShelfTab('library');
    st.setScreen('library');
  };

  const subtitle = loading
    ? 'Loading…'
    : `${filtered.length} ${filtered.length === 1 ? 'collection' : 'collections'}`;

  return (
    <BrowseView
      st={st}
      title="Collections"
      subtitle={subtitle}
      showModeToggle
      inline={inline}
    >
      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', letterSpacing: '0.08em' }}>
          Loading collections…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: SERIF, fontSize: 15, color: 'var(--onyx-text-mute)', fontStyle: 'italic' }}>
          No collections yet — right-click any book to create one.
        </div>
      ) : st.libraryView === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 22 }}>
          {filtered.map(c => {
            const books = booksFor(c);
            return (
              <button key={c.id} onClick={() => openCollection(c)} className="onyx-poster" style={posterTile()}>
                {books.length > 0 ? (
                  <CoverMosaic books={books} serverUrl={st.serverUrl} />
                ) : (
                  <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--onyx-text-mute)', fontFamily: SERIF, fontStyle: 'italic', fontSize: 14, background: 'linear-gradient(180deg, rgba(212,166,74,0.06), rgba(0,0,0,0.12))', borderBottom: '1px solid var(--onyx-line)' }}>
                    Empty collection
                  </div>
                )}
                <div style={{ padding: '18px 16px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, lineHeight: 1.1, color: 'var(--onyx-text)', letterSpacing: '-0.01em' }}>{c.name}</div>
                  {c.description && (
                    <div style={{ fontSize: 13, color: 'var(--onyx-text-dim)', marginTop: 6, fontStyle: 'italic' }}>{c.description}</div>
                  )}
                  <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--onyx-line)' }}>
                    {books.length} TITLE{books.length === 1 ? '' : 'S'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <BrowseList
          columns={[
            { id: 'name',        label: 'Collection',  flex: 2 },
            { id: 'description', label: 'Description', flex: 2 },
            { id: 'titles',      label: 'Titles',      width: 80 },
          ]}
          rows={filtered.map(c => {
            const books = booksFor(c);
            return {
              key: c.id,
              onClick: () => openCollection(c),
              leading: books[0]
                ? <Cover item={books[0]} size={28} serverUrl={st.serverUrl} />
                : <div style={{ width: 28, height: 28, borderRadius: 4, background: 'var(--onyx-glass)', border: '1px dashed var(--onyx-glass-edge)' }} />,
              sort: { name: c.name, description: c.description ?? '', titles: books.length },
              cells: {
                name:        <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500, color: 'var(--onyx-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>,
                description: <div style={{ fontSize: 12.5, color: 'var(--onyx-text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description ?? ''}</div>,
                titles:      <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>{books.length}</div>,
              },
            };
          })}
        />
      )}
    </BrowseView>
  );
}
