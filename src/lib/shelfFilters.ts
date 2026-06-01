// Shared filter predicate for shelf grouping tabs (Series, Authors,
// Narrators, Collections). Determines whether a group of books matches
// the active status filter (all / reading / unread / finished) based on
// each book's saved media progress. Extracted from four verbatim copies
// that previously lived inline in each tab component.
import type { LibraryItem, MediaProgress } from '../state/onyx';

export function groupMatchesFilter(
  books: LibraryItem[],
  filter: string,
  mediaProgress: MediaProgress[],
): boolean {
  // 'all' always matches — show every group regardless of progress
  if (filter === 'all') return true;

  // 'reading' — at least one book in the group is in progress (started but not finished)
  if (filter === 'reading') return books.some(b => {
    const p = mediaProgress.find(x => x.libraryItemId === b.id);
    return Boolean(p && p.progress > 0 && !p.isFinished);
  });

  // 'unread' — at least one book has no progress entry or progress is exactly 0
  if (filter === 'unread') return books.some(b => {
    const p = mediaProgress.find(x => x.libraryItemId === b.id);
    return !p || p.progress === 0;
  });

  // 'finished' — every book in the group must be marked finished
  // (uses .every so a mixed group with unfinished books is excluded)
  if (filter === 'finished') return books.every(b => {
    const p = mediaProgress.find(x => x.libraryItemId === b.id);
    return p?.isFinished === true;
  });

  // Unknown filter value — default to showing the group
  return true;
}
