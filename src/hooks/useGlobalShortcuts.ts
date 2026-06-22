import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  registerShortcuts,
  seekAudio,
  setVolume as setAudioVolume,
} from '../api/abs';
// muteAudio/unmuteAudio share identical logic with the VolumeControl button
// so both input paths behave the same and LibVLC is always in sync with the UI.
// togglePlayback is the canonical pause/resume (applies auto-rewind-on-resume).
import { muteAudio, unmuteAudio, togglePlayback } from '../api/playbook';
import { skipSeconds } from '../lib/playbackPrefs';
import type { OnyxState } from '../state/onyx';
import type { ShortcutBinding } from '../api/abs';

// Module-level flag prevents React StrictMode's double-mount from registering
// duplicate Tauri event listeners, which would cause each shortcut to fire twice.
let registered = false;

export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { action: 'play_pause',   shortcut: 'Ctrl+Alt+Space' },
  { action: 'skip_forward', shortcut: 'Ctrl+Alt+Right' },
  { action: 'skip_back',    shortcut: 'Ctrl+Alt+Left'  },
  { action: 'volume_up',    shortcut: 'Ctrl+Alt+Up'    },
  { action: 'volume_down',  shortcut: 'Ctrl+Alt+Down'  },
  { action: 'mute',         shortcut: 'Ctrl+Alt+M'     },
];

function loadBindings(): ShortcutBinding[] {
  try {
    const raw = localStorage.getItem('onyx.shortcuts');
    if (raw) return JSON.parse(raw) as ShortcutBinding[];
  } catch { /* fall through */ }
  return DEFAULT_SHORTCUTS;
}

export function useGlobalShortcuts(st: OnyxState): void {
  const stRef = useRef(st);

  useEffect(() => {
    stRef.current = st;
  });

  useEffect(() => {
    if (registered) return;
    registered = true;

    const bindings = loadBindings();
    registerShortcuts(bindings).catch(console.error);

    const unlisteners: Array<() => void> = [];

    function on(event: string, handler: () => void) {
      listen(event, handler)
        .then(fn => unlisteners.push(fn))
        .catch(console.error);
    }

    listen('shortcut-play_pause', () => {
      // Canonical toggle — pauses, or resumes with auto-rewind-on-resume applied.
      togglePlayback(stRef.current).catch(console.error);
    }).then(fn => unlisteners.push(fn)).catch(console.error);

    on('shortcut-skip_forward', () => {
      seekAudio(stRef.current.position + skipSeconds()).catch(console.error);
    });

    on('shortcut-skip_back', () => {
      seekAudio(Math.max(0, stRef.current.position - skipSeconds())).catch(console.error);
    });

    on('shortcut-volume_up', () => {
      const vol = Math.min(1, stRef.current.volume + 0.1);
      stRef.current.setVolume(vol);
      setAudioVolume(Math.round(vol * 100)).catch(console.error);
    });

    on('shortcut-volume_down', () => {
      const vol = Math.max(0, stRef.current.volume - 0.1);
      stRef.current.setVolume(vol);
      setAudioVolume(Math.round(vol * 100)).catch(console.error);
    });

    on('shortcut-mute', () => {
      // Use stRef.current to avoid stale closures — the helpers receive the
      // live OnyxState snapshot and handle both LibVLC and UI state in sync.
      if (stRef.current.muted) {
        unmuteAudio(stRef.current);
      } else {
        muteAudio(stRef.current);
      }
    });

    return () => unlisteners.forEach(fn => fn());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
