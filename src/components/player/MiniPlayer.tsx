import type { OnyxState } from '../../state/onyx';
import { bookTitle, bookAuthor, fmtTime } from '../../state/onyx';
// togglePlayback pairs the LibVLC command with st.setPlaying so the icon
// updates immediately instead of waiting for the next playback-tick event.
import { togglePlayback } from '../../api/playbook';
import { seekAudio } from '../../api/abs';
import Cover from '../Cover';
import Icon from '../Icon';

const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = '"Source Serif 4", "Iowan Old Style", Georgia, serif';

const BARS = 64;

export interface MiniPlayerProps { st: OnyxState; }

export default function MiniPlayer({ st }: MiniPlayerProps) {
  const playing = st.playing;
  const currentBook = st.currentBook;

  if (!currentBook || !st.currentBookId) return null;
  if (!st.focusedBookId || st.focusedBookId === st.currentBookId) return null;

  const progress = st.bookSecs > 0 ? Math.min(1, st.position / st.bookSecs) : 0;
  const playedTo = Math.floor(BARS * progress);

  // Current chapter (if the playing book has chapter data) → "Ch. N" + its title.
  const chapters = currentBook.media?.chapters ?? [];
  const curChapter = chapters.find(c => st.position >= c.start && st.position < c.end) ?? null;
  const chapterNum = curChapter ? chapters.indexOf(curChapter) + 1 : 0;
  const eyebrow = chapterNum ? `Now Playing · Ch. ${chapterNum}` : 'Now Playing';
  const subtitle = curChapter?.title || bookAuthor(currentBook) || '';

  // Click-to-seek on the waveform (absolute seconds, mirroring the full player).
  const onSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (st.bookSecs <= 0) return;
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    seekAudio(frac * st.bookSecs).catch(console.error);
  };

  return (
    <div style={{
      // In-flow at the bottom of the Player's left column (not an overlay), so it
      // never covers the title/synopsis. Fills the column's full width.
      width: '100%',
      flexShrink: 0,
      marginTop: 14,
      background: 'var(--onyx-glass-strong)',
      backdropFilter: 'blur(40px) saturate(120%)',
      WebkitBackdropFilter: 'blur(40px) saturate(120%)',
      border: '1px solid var(--onyx-glass-edge)',
      borderRadius: 14,
      boxShadow: '0 16px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
      padding: 14,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      boxSizing: 'border-box',
    }}>
      {/* Header — cover + chapter eyebrow + title + subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <button
          onClick={() => st.setFocusedBookId(st.currentBookId)}
          title="Return to now playing"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, lineHeight: 0 }}
        >
          <Cover item={currentBook} size={40} serverUrl={st.serverUrl} style={{ borderRadius: 6 }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: 8.5, color: 'var(--onyx-text-mute)', letterSpacing: '0.14em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {eyebrow}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 500, color: 'var(--onyx-text)', lineHeight: 1.15, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {bookTitle(currentBook)}
          </div>
          {subtitle && (
            <div style={{ fontSize: 11.5, color: 'var(--onyx-text-dim)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Progress ticks — flat, equal-height bars (audiobooks aren't music, so a
          real waveform adds noise); click to seek; playhead line at the position. */}
      <div onClick={onSeek} style={{ position: 'relative', height: 22, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }} title="Seek">
        {Array.from({ length: BARS }).map((_, i) => (
          <div key={i} style={{
            flex: 1, minWidth: 0, height: '100%', borderRadius: 1,
            background: 'var(--onyx-accent)',
            opacity: i < playedTo ? 1 : 0.28,
          }} />
        ))}
        <div style={{ position: 'absolute', top: -2, bottom: -2, left: `${progress * 100}%`, width: 2, background: 'var(--onyx-accent)', borderRadius: 1, boxShadow: '0 0 6px var(--onyx-accent)', pointerEvents: 'none' }} />
      </div>

      {/* Footer — elapsed / total + play-pause */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontFamily: MONO, fontSize: 11 }}>
          <span style={{ color: 'var(--onyx-text)', fontWeight: 600 }}>{fmtTime(st.position)}</span>
          <span style={{ color: 'var(--onyx-text-mute)' }}> / {fmtTime(st.bookSecs)}</span>
        </div>
        <button
          onClick={() => togglePlayback(st)} // togglePlayback syncs st.playing immediately
          style={{
            width: 40, height: 40, borderRadius: 20, flexShrink: 0,
            background: 'var(--onyx-accent)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--onyx-bg)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          }}
          title={playing ? 'Pause' : 'Play'}
        >
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
      </div>
    </div>
  );
}
