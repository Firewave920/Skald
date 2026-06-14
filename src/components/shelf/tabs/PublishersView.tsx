import type { OnyxState, LibraryItem } from '../../../state/onyx';
import { groupMatchesFilter } from '../../../lib/shelfFilters';
import { bookTitle, bookPublisher, bookDurSecs } from '../../../state/onyx';
import BrowseView, { seriesTotalDur } from '../BrowseView';
import BrowseList from '../BrowseList';
import BrowseTile from '../BrowseTile';
import Initial from '../Initial';

const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';
const MONO = "'JetBrains Mono', ui-monospace, monospace";

interface PublisherGroup { name: string; books: LibraryItem[]; }

export interface PublishersViewProps {
  st: OnyxState;
  inline?: boolean;
}

export default function PublishersView({ st, inline = false }: PublishersViewProps) {
  const groups: Record<string, LibraryItem[]> = {};
  for (const b of st.library) {
    const p = bookPublisher(b);
    if (!p) continue;
    if (!groups[p]) groups[p] = [];
    groups[p].push(b);
  }

  let list: PublisherGroup[] = Object.entries(groups)
    .map(([name, books]) => ({ name, books }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (st.search) {
    const q = st.search.toLowerCase();
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.books.some(b => bookTitle(b).toLowerCase().includes(q))
    );
  }

  if (st.filter !== 'all') {
    list = list.filter(p => groupMatchesFilter(p.books, st.filter, st.mediaProgress));
  }

  const open = (name: string) => {
    st.setContextFilter({ kind: 'publisher', value: name });
    st.setShelfTab('library');
    st.setScreen('library');
  };

  return (
    <BrowseView st={st} title="Publishers" subtitle={`${list.length} publishers in your library`} showModeToggle inline={inline}>
      {st.libraryView === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 22 }}>
          {list.map(p => (
            <BrowseTile
              key={p.name}
              mode={st.browseTileStyle}
              tag="Publisher"
              title={p.name}
              stat={`${p.books.length} TITLE${p.books.length === 1 ? '' : 'S'} · ${seriesTotalDur(p.books)}`}
              books={p.books}
              serverUrl={st.serverUrl}
              onClick={() => open(p.name)}
            />
          ))}
        </div>
      ) : (
        <BrowseList
          columns={[
            { id: 'name',   label: 'Publisher', flex: 2   },
            { id: 'titles', label: 'Titles',    width: 80 },
            { id: 'dur',    label: 'Duration',  width: 110 },
          ]}
          rows={list.map(p => ({
            key: p.name,
            onClick: () => open(p.name),
            leading: <Initial name={p.name} small />,
            sort: { name: p.name, titles: p.books.length, dur: p.books.reduce((acc, b) => acc + bookDurSecs(b), 0) },
            cells: {
              name:   <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 500 }}>{p.name}</div>,
              titles: <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>{p.books.length}</div>,
              dur:    <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)' }}>{seriesTotalDur(p.books)}</div>,
            },
          }))}
        />
      )}
    </BrowseView>
  );
}
