// SyncSection — settings pane for controlling how Skald synchronises with the server.
//
// Phase A introduced the toggle and WIP badge (cosmetic only).
// Phase B wires the toggle to the actual Rust Socket.IO connect/disconnect commands.
// Future phases (C–G) will build on top of the connection established here.
import { SectionHead, Row, Toggle, useLocal, MONO } from './shared';
import type { OnyxState } from '../../state/onyx';
import { connectSocket, disconnectSocket } from '../../api/abs';

export interface SyncSectionProps {
  // OnyxState provides serverUrl and authToken needed by connectSocket.
  st: OnyxState;
}

export default function SyncSection({ st }: SyncSectionProps) {
  // Persist the live-sync preference to localStorage.
  // 'onyx.sync.live' is read by AccountSection and App.tsx to restore the
  // connection on startup and to choose the correct presence-dot behaviour.
  const [liveSync, setLiveSync] = useLocal<boolean>('onyx.sync.live', false);

  // Handle toggle changes: update localStorage and drive the Rust socket.
  // The toggle optimistically updates; if the socket call fails it rolls back.
  async function handleToggle(next: boolean) {
    // Write the preference immediately so AccountSection sees the new mode
    // even before the connection attempt completes.
    setLiveSync(next);

    try {
      if (next) {
        // Enabling — open the Socket.IO connection.
        // connectSocket stores the client in Rust managed state so it
        // persists across renders and can be closed by disconnectSocket.
        await connectSocket(st.serverUrl, st.authToken);
      } else {
        // Disabling — tear down the connection cleanly.
        // disconnect is safe to call when no connection is open.
        await disconnectSocket();
      }
    } catch (e) {
      // If the socket call fails (e.g. server unreachable), roll the toggle
      // back so the displayed state matches reality and the user can retry.
      console.warn('[sync] toggle failed:', e);
      setLiveSync(!next);
    }
  }

  return (
    <div>
      {/* Section header */}
      <SectionHead
        title="Sync"
        subtitle="Control how Skald stays in sync with your server."
      />

      {/* ── Live sync toggle row ── */}
      <Row
        label="Live sync"
        hint="Maintain a live connection to the server for real-time progress and library updates. Experimental."
      >
        {/* Right-side slot: WIP badge + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {/* WIP badge — socket connection established but no events consumed yet.
              Remove once Phase C (presence) is complete and the feature is stable. */}
          <span style={{
            fontFamily: MONO,
            fontSize: 9,
            letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            padding: '2px 7px',
            borderRadius: 4,
            background: 'rgba(212,166,74,0.12)',
            color: '#d4a64a',
            border: '1px solid rgba(212,166,74,0.28)',
            whiteSpace: 'nowrap' as const,
          }}>
            WIP
          </span>

          {/* Toggle calls handleToggle which drives the Rust socket commands.
              onChange signature accepts async functions — the Promise return
              value is safely ignored by the Toggle component. */}
          <Toggle on={liveSync} onChange={handleToggle} />
        </div>
      </Row>
    </div>
  );
}
