import type { OnyxState, LibraryItem } from '../../../state/onyx';
import { groupMatchesFilter } from '../../../lib/shelfFilters';
import { bookTitle, bookAuthor, bookSeries, bookDurSecs } from '../../../state/onyx';
import type { SeriesObject } from '../../../api/abs';
import BrowseView, { posterTile, seriesTotalDur } from '../BrowseView';
import BrowseList from '../BrowseList';
import CoverFan from '../CoverFan';
import Cover from '../../Cover';

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface SeriesGroup {
  name: string;
  books: LibraryItem[];
}

// Extract series name from the full series object (preferred) or fall back to flat seriesName.
function seriesNameOf(b: LibraryItem): string {
  const s = b.media?.metadata?.series as SeriesObject | SeriesObject[] | null | undefined;
  if (s) {
    const first = Array.isArray(s) ? s[0] : s;
    if (first?.name) return first.name;
  }
  return bookSeries(b) ?? '';
}

function seriesVolOf(b: LibraryItem): number {
  const s = b.media?.metadata?.series as SeriesObject | SeriesObject[] | null | undefined;
  if (s) {
    const first = Array.isArray(s) ? s[0] : s;
    const seq = first?.sequence;
    if (typeof seq === 'number') return seq;
    if (typeof seq === 'string') return parseFloat(seq) || 0;
  }
  const flat = bookSeries(b) ?? '';
  const h = flat.match(/#(\d+)/);
  if (h) return parseInt(h[1], 10);
  const d = flat.match(/·\s*(\d+)/);
  return d ? parseInt(d[1], 10) : 0;
}


export interface SeriesViewProps {
  st: OnyxState;
  inline?: boolean;
}

export default function SeriesView({ st, inline = false }: SeriesViewProps) {
  const groups: Record<string, LibraryItem[]> = {};
  for (const b of st.library) {
    const name = seriesNameOf(b);
    if (!name) continue;
    if (!groups[name]) groups[name] = [];
    groups[name].push(b);
  }

  let seriesList: SeriesGroup[] = Object.entries(groups)
    .map(([name, books]) => ({
      name,
      books: books.slice().sort((a, b) => seriesVolOf(a) - seriesVolOf(b)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (st.search) {
    const q = st.search.toLowerCase();
    seriesList = seriesList.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.books.some(b => bookAuthor(b).toLowerCase().includes(q) || bookTitle(b).toLowerCase().includes(q))
    );
  }

  if (st.filter !== 'all') {
    seriesList = seriesList.filter(s => groupMatchesFilter(s.books, st.filter, st.mediaProgress));
  }

  const openSeries = (name: string) => {
    st.setContextFilter({ kind: 'series', value: name });
    st.setShelfTab('library');
    st.setScreen('library');
  };

  return (
    <BrowseView st={st} title="Series" subtitle={`${seriesList.length} series in your library`} showModeToggle inline={inline}>
      {st.libraryView === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 22 }}>
          {seriesList.map(s => (
            <button key={s.name} onClick={() => openSeries(s.name)} className="onyx-poster" style={posterTile()}>
              <CoverFan books={s.books.slice(0, 5)} serverUrl={st.serverUrl} />
              <div style={{ padding: '18px 16px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 500, lineHeight: 1.1, color: 'var(--onyx-text)', letterSpacing: '-0.01em' }}>{s.name}</div>
                <div style={{ fontSize: 13, color: 'var(--onyx-text-dim)', marginTop: 6, fontStyle: 'italic' }}>{bookAuthor(s.books[0])}</div>
                <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--onyx-line)' }}>
                  {s.books.length} {s.books.length === 1 ? 'VOLUME' : 'VOLUMES'}{' '}
                  <span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>
                  {seriesTotalDur(s.books)}
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <BrowseList
          columns={[
            { id: 'name',   label: 'Series',   flex: 2   },
            { id: 'author', label: 'Author',   flex: 1.5 },
            { id: 'vols',   label: 'Volumes',  width: 90 },
            { id: 'dur',    label: 'Duration', width: 110 },
          ]}
          rows={seriesList.map(s => ({
            key: s.name,
            onClick: () => openSeries(s.name),
            leading: <Cover item={s.books[0]} size={28} serverUrl={st.serverUrl} />,
            sort: {
              name:   s.name,
              author: bookAuthor(s.books[0]),
              vols:   s.books.length,
              dur:    s.books.reduce((acc, b) => acc + bookDurSecs(b), 0),
            },
            cells: {
              name:   <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500, color: 'var(--onyx-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>,
              author: <div style={{ fontSize: 13, color: 'var(--onyx-text-dim)' }}>{bookAuthor(s.books[0])}</div>,
              vols:   <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>{s.books.length}</div>,
              dur:    <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>{seriesTotalDur(s.books)}</div>,
            },
          }))}
        />
      )}
    </BrowseView>
  );
}
