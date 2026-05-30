import { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { LibraryItem } from '../state/onyx';
import { getCollections, addBookToCollection, createCollection } from '../api/abs';
import type { Collection } from '../api/abs';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';

export interface CollectionPickerProps {
  item: LibraryItem;
  serverUrl: string;
  onClose: () => void;
}

export default function CollectionPicker({ item, serverUrl, onClose }: CollectionPickerProps) {
  const [collections, setCollections] = useState<Collection[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [newMode, setNewMode] = useState(false);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCollections(serverUrl, item.libraryId)
      .then(setCollections)
      .catch(e => setError(String(e)));
  }, [serverUrl, item.libraryId]);

  useEffect(() => {
    if (newMode) inputRef.current?.focus();
  }, [newMode]);

  async function handleAdd(col: Collection) {
    setAdding(col.id);
    try {
      await addBookToCollection(serverUrl, col.id, item.id);
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
      await createCollection(serverUrl, item.libraryId, name, item.id);
      onClose();
    } catch (e) {
      setError(String(e));
      setCreating(false);
    }
  }

  function onNewKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCreate();
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
            Add to Collection
          </div>
          <div style={{ fontFamily: MONO, fontSize: 10, color: 'var(--onyx-text-mute)', marginTop: 4, letterSpacing: '0.04em' }}>
            Choose a collection for this book
          </div>
        </div>

        {/* Collection list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {collections === null && !error && (
            <div style={{ padding: '16px 20px', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', letterSpacing: '0.06em' }}>
              Loading…
            </div>
          )}
          {error && (
            <div style={{ padding: '12px 20px', fontSize: 12, color: '#e8716a' }}>{error}</div>
          )}
          {collections !== null && collections.length === 0 && (
            <div style={{ padding: '12px 20px', fontFamily: MONO, fontSize: 11, color: 'var(--onyx-text-mute)', letterSpacing: '0.04em' }}>
              No collections
            </div>
          )}
          {collections?.map(col => (
            <button
              key={col.id}
              disabled={adding !== null || creating}
              onClick={() => handleAdd(col)}
              style={{
                display: 'block', width: '100%',
                padding: '10px 20px',
                background: adding === col.id ? 'var(--onyx-accent-dim)' : 'transparent',
                border: 'none',
                color: adding === col.id ? 'var(--onyx-accent)' : 'var(--onyx-text)',
                fontSize: 13.5, textAlign: 'left',
                cursor: (adding !== null || creating) ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 0.1s',
              }}
            >
              {adding === col.id ? 'Adding…' : col.name}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px 6px', borderTop: '1px solid var(--onyx-line)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* New Collection row */}
          {newMode ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={onNewKeyDown}
                placeholder="Collection name…"
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
                onClick={handleCreate}
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
                {creating ? 'Creating…' : 'Create'}
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
              + New Collection
            </button>
          )}

          {/* Cancel */}
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
