import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { LibraryItem } from '../state/onyx';
import { getPlaylists, createPlaylist, batchAddToPlaylist } from '../api/abs';
import type { Playlist } from '../api/abs';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';

export interface PlaylistPickerProps {
  item: LibraryItem;
  serverUrl: string;
  onClose: () => void;
}

export default function PlaylistPicker({ item, serverUrl, onClose }: PlaylistPickerProps) {
  const [playlists, setPlaylists] = useState<Playlist[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getPlaylists(serverUrl, item.libraryId)
      .then(setPlaylists)
      .catch(e => setError(String(e)));
  }, [serverUrl, item.libraryId]);

  useEffect(() => {
    if (newMode) inputRef.current?.focus();
  }, [newMode]);

  async function handleAdd(playlist: Playlist) {
    setAdding(playlist.id);
    try {
      await batchAddToPlaylist(serverUrl, playlist.id, [{ libraryItemId: item.id }]);
      onClose();
    } catch (e) {
      setError(String(e));
      setAdding(null);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      // Create the playlist with the item pre-populated — one round-trip instead of two.
      await createPlaylist(serverUrl, item.libraryId, name, null, [{ libraryItemId: item.id }]);
      onClose();
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  }

  function onNewKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { void handleCreate(); }
    if (e.key === 'Escape') { setNewMode(false); setNewName(''); }
  }

  const modal = (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
      }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 340,
        background: 'var(--onyx-panel2)',
        border: '1px solid var(--onyx-line)',
        borderRadius: 12,
        boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
        padding: '20px 0 8px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '60vh',
      }}>
        {/* Header */}
        <div style={{ padding: '0 20px 14px', borderBottom: '1px solid var(--onyx-line)' }}>
          <div style={{ fontFamily: SERIF, fontSize: 17, fontWeight: 500, color: 'var(--onyx-text)' }}>
            Add to Playlist
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', marginTop: 4, letterSpacing: '0.04em' }}>
            Choose a playlist for this book
          </div>
        </div>

        {/* Playlist list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {playlists === null && !error && (
            <div style={{ padding: '16px 20px', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', letterSpacing: '0.06em' }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ padding: '12px 20px', fontSize: 12, color: '#e8716a' }}>{error}</div>
          )}
          {playlists !== null && playlists.length === 0 && !newMode && (
            <div style={{ padding: '12px 20px', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', letterSpacing: '0.04em' }}>
              No playlists — create one below
            </div>
          )}
          {playlists?.map(pl => (
            <button
              key={pl.id}
              disabled={adding !== null || creating}
              onClick={() => { void handleAdd(pl); }}
              style={{
                display: 'block', width: '100%',
                padding: '10px 20px',
                background: adding === pl.id ? 'var(--onyx-accent-dim)' : 'transparent',
                border: 'none',
                color: adding === pl.id ? 'var(--onyx-accent)' : 'var(--onyx-text)',
                fontSize: 13.5, textAlign: 'left',
                cursor: (adding !== null || creating) ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
            >
              {adding === pl.id ? 'Adding…' : pl.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px 6px', borderTop: '1px solid var(--onyx-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {newMode ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={onNewKeyDown}
                placeholder="Playlist name…"
                disabled={creating}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--onyx-accent-edge)',
                  borderRadius: 6,
                  color: 'var(--onyx-text)',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={() => { void handleCreate(); }}
                disabled={!newName.trim() || creating}
                style={{
                  padding: '7px 12px',
                  background: newName.trim() && !creating ? 'var(--onyx-accent)' : 'var(--onyx-accent-dim)',
                  border: 'none',
                  borderRadius: 6,
                  color: newName.trim() && !creating ? '#0b0b0e' : 'var(--onyx-text-mute)',
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  cursor: newName.trim() && !creating ? 'pointer' : 'default',
                  whiteSpace: 'nowrap' as const,
                }}
              >
                {creating ? 'Creating…' : 'Create & Add'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setNewMode(true)}
              disabled={adding !== null}
              style={{
                background: 'transparent',
                border: '1px solid var(--onyx-accent-edge)',
                borderRadius: 6,
                color: 'var(--onyx-accent)',
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase' as const,
                padding: '6px 14px',
                cursor: 'pointer',
                alignSelf: 'flex-start',
              }}
            >
              + New Playlist
            </button>
          )}

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--onyx-glass-edge)',
              borderRadius: 6,
              color: 'var(--onyx-text-dim)',
              fontFamily: MONO,
              fontSize: 10,
              letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              padding: '6px 14px',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
}
