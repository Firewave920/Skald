import type { LibraryItem, OnyxState } from '../../state/onyx';
import type { ContextMenuItem, ContextMenuSection } from '../ContextMenu';
import { rescanItem, deleteItem } from '../../api/abs';

// Right-click menu for a podcast in the podcast library (cluster E). Mirrors the
// audiobook menu's sectioned layout but with podcast-relevant actions — the key
// addition is Unsubscribe (which removes the podcast library item). Most actions
// require admin/update/delete permission on the server, so they're admin-gated.
export interface BuildPodcastContextMenuOpts {
  /** Navigate to the podcast detail screen. */
  openDetail: (id: string) => void;
  /** Open the episode download picker for this podcast. */
  setDownloadItem?: (item: LibraryItem) => void;
  /** Open the auto-download settings modal. */
  setSettingsItem?: (item: LibraryItem) => void;
  setCoverItem?: (item: LibraryItem) => void;
  setFilesItem?: (item: LibraryItem) => void;
  /** Called after a successful unsubscribe so the caller can clear selection. */
  onUnsubscribed?: (id: string) => void;
}

export function buildPodcastContextMenu(
  item: LibraryItem,
  st: OnyxState,
  opts: BuildPodcastContextMenuOpts,
): ContextMenuSection[] {
  const { openDetail, setDownloadItem, setSettingsItem, setCoverItem, setFilesItem, onUnsubscribed } = opts;
  const isAdmin = st.user?.type === 'root' || st.user?.type === 'admin';
  const title = item.media?.metadata?.title ?? 'this podcast';

  // ── PODCAST ────────────────────────────────────────────────────────────────
  const podcast: ContextMenuItem[] = [
    { label: 'Open Podcast', icon: 'list', primary: true, onClick: () => openDetail(item.id) },
  ];
  if (isAdmin) {
    podcast.push(
      { label: 'Download Episodes…', icon: 'download', onClick: () => setDownloadItem?.(item), disabled: !setDownloadItem },
      { label: 'Auto-download Settings', icon: 'sliders', onClick: () => setSettingsItem?.(item), disabled: !setSettingsItem },
    );
  }

  const sections: ContextMenuSection[] = [{ label: 'Podcast', items: podcast }];

  // ── MANAGE (admin only) ─────────────────────────────────────────────────────
  if (isAdmin) {
    sections.push({
      label: 'Manage',
      items: [
        { label: 'Change Cover', icon: 'image', onClick: () => setCoverItem?.(item), disabled: !setCoverItem },
        { label: 'Files', icon: 'file', onClick: () => setFilesItem?.(item), disabled: !setFilesItem },
        {
          label: 'Re-Scan',
          icon: 'refresh',
          onClick: () => {
            rescanItem(st.serverUrl, item.id)
              .then(() => st.setToast({ message: `Rescan started for "${title}"`, type: 'success' }))
              .catch(e => st.setToast({ message: `Rescan failed: ${String(e)}`, type: 'error' }));
          },
        },
      ],
    });

    // Unsubscribe sits in its own divided-off group, like the audiobook Delete.
    sections.push({
      items: [
        {
          label: 'Unsubscribe',
          icon: 'trash',
          danger: true,
          onClick: () => {
            st.setConfirmDialog({
              title: `Unsubscribe from "${title}"?`,
              message: 'This removes the podcast from your library. If file deletion is enabled on the server, its downloaded episodes are also deleted from disk. This cannot be undone.',
              confirmLabel: 'Unsubscribe',
              onConfirm: () => {
                deleteItem(st.serverUrl, item.id)
                  .then(() => {
                    st.removeLibraryItem(item.id);
                    onUnsubscribed?.(item.id);
                    st.setToast({ message: `Unsubscribed from "${title}"`, type: 'success' });
                  })
                  .catch(e => st.setToast({ message: `Unsubscribe failed: ${String(e)}`, type: 'error' }));
              },
            });
          },
        },
      ],
    });
  }

  return sections;
}
