import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { OnyxState } from '../../state/onyx';
import type { Library } from '../../api/abs';
import { createLocalLibrary, deleteLocalLibrary, scanLocalLibrary } from '../../api/abs';
import { log } from '../../lib/log';
import Icon from '../Icon';
import { SectionHead, Panel, MONO, DIM_GOLD } from './shared';

// Local Library settings (Local Library & Split Libraries roadmap, Phase 2/3).
// Create a local library from a folder on disk, (re)scan it into the catalog, and
// switch to it. Unlike the ABS Libraries section this is always available — local
// libraries are a client-side concept and require neither a server nor admin.
export interface LocalLibrarySectionProps { st: OnyxState; }

export default function LocalLibrarySection({ st }: LocalLibrarySectionProps) {
  // Busy id: the library currently scanning (or '__new__' while adding), so the
  // relevant button shows a spinner and is disabled.
  const [busy, setBusy] = useState<string | null>(null);

  const locals: Library[] = st.libraries.filter(l => l.source === 'local');

  // Folder name → default library name (last path segment).
  const folderName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() || 'Local Library';

  async function addLibrary() {
    try {
      const dir = await open({ directory: true, multiple: false, title: 'Choose a library folder' });
      if (typeof dir !== 'string') return; // cancelled
      setBusy('__new__');
      const name = folderName(dir);
      log.info('library', 'add local library', { name });
      const lib = await createLocalLibrary(name, dir);
      const count = await scanLocalLibrary(lib.id);
      await st.refreshLibrary();
      st.setToast({ message: `Added "${name}" — ${count} item${count === 1 ? '' : 's'}`, type: 'success' });
    } catch (e) {
      log.error('library', 'add local library failed', { err: String(e) });
      st.setToast({ message: 'Could not add local library', type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  async function rescan(lib: Library) {
    try {
      setBusy(lib.id);
      const count = await scanLocalLibrary(lib.id);
      // If the rescanned library is the active one, reload its items into the shelf.
      if (st.currentLibraryId === lib.id) await st.setActiveLibrary(lib.id);
      st.setToast({ message: `Rescanned "${lib.name}" — ${count} item${count === 1 ? '' : 's'}`, type: 'success' });
    } catch (e) {
      log.error('library', 'rescan local library failed', { err: String(e) });
      st.setToast({ message: 'Rescan failed', type: 'error' });
    } finally {
      setBusy(null);
    }
  }

  function removeLibrary(lib: Library) {
    st.setConfirmDialog({
      title: 'Remove local library',
      message: `Remove "${lib.name}" from Skald? This only removes it from the catalog — your files on disk are left untouched.`,
      confirmLabel: 'Remove',
      onConfirm: async () => {
        try {
          await deleteLocalLibrary(lib.id);
          await st.refreshLibrary();
          st.setToast({ message: `Removed "${lib.name}"`, type: 'info' });
        } catch (e) {
          log.error('library', 'remove local library failed', { err: String(e) });
          st.setToast({ message: 'Could not remove library', type: 'error' });
        }
      },
    });
  }

  const rootPath = (lib: Library) => lib.folders?.[0]?.fullPath ?? '';

  return (
    <div>
      <SectionHead
        title="Local Library"
        subtitle="Build a library from audiobooks on this computer — no server required. Skald scans the folder, reads embedded metadata, and adds the books alongside any Audiobookshelf libraries."
      />

      <Panel
        label="Your local libraries"
        action={
          <button
            onClick={addLibrary}
            disabled={busy === '__new__'}
            style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 8,
              background: 'var(--onyx-accent-dim)', border: '1px solid var(--onyx-accent-edge)',
              color: 'var(--onyx-accent)', cursor: busy === '__new__' ? 'default' : 'pointer',
              fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
              opacity: busy === '__new__' ? 0.6 : 1,
            }}
          >
            <Icon name="plus" size={12} />
            {busy === '__new__' ? 'Scanning…' : 'Add folder…'}
          </button>
        }
      >
        {locals.length === 0 ? (
          <div style={{ padding: '22px 4px', color: 'var(--onyx-text-mute)', fontSize: 13 }}>
            No local libraries yet. Choose a folder of audiobooks to get started.
          </div>
        ) : (
          locals.map(lib => {
            const active = st.currentLibraryId === lib.id;
            const scanning = busy === lib.id;
            return (
              <div
                key={lib.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  padding: '14px 0', borderBottom: '1px solid var(--onyx-line)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--onyx-text)' }}>{lib.name}</span>
                    {active && (
                      <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: DIM_GOLD }}>
                        Active
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--onyx-text-mute)', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {rootPath(lib)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {!active && (
                    <button onClick={() => st.setActiveLibrary(lib.id)} style={btn()}>Open</button>
                  )}
                  <button onClick={() => rescan(lib)} disabled={scanning} style={btn(scanning)}>
                    {scanning ? 'Scanning…' : 'Rescan'}
                  </button>
                  <button onClick={() => removeLibrary(lib)} style={btn(false, true)}>Remove</button>
                </div>
              </div>
            );
          })
        )}
      </Panel>
    </div>
  );
}

// Small mono action button used in the library rows.
function btn(disabled = false, danger = false): React.CSSProperties {
  return {
    padding: '6px 11px', borderRadius: 6, fontFamily: MONO, fontSize: 10,
    letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.55 : 1,
    background: 'transparent',
    border: `1px solid ${danger ? 'rgba(220,90,90,0.35)' : 'var(--onyx-glass-edge)'}`,
    color: danger ? 'rgba(230,120,120,0.9)' : 'var(--onyx-text-dim)',
  };
}
