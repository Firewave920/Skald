// Reads the user's Playback-behaviour preferences (Settings → Playback) from
// localStorage. Centralized so every consumer — the transport ±skip buttons, the
// ←/→ keys, the global OS shortcuts, and the resume path — agrees on one value
// instead of hardcoding their own. Values are written by PlaybackSection via
// `useLocal`, which JSON-stringifies, so they are parsed with JSON.parse here.

// Skip step in seconds, used by the ±skip buttons, the ←/→ keys, and the global
// skip shortcuts. Stored as e.g. "30s"; defaults to 30 on absence / parse error.
export function skipSeconds(): number {
  try {
    const raw = localStorage.getItem('onyx.playback.skip') ?? '"30s"';
    const str = JSON.parse(raw) as string;
    return parseInt(str.replace('s', ''), 10) || 30;
  } catch {
    return 30;
  }
}

// Auto-rewind-on-resume step in seconds. Stored as "Off" | "2s" | "5s" | "10s";
// "Off" (or an unparseable value) yields 0, meaning "do not rewind on resume".
// Defaults to 5 when the key is absent (matches PlaybackSection's default).
export function rewindSeconds(): number {
  try {
    const raw = localStorage.getItem('onyx.playback.rewind') ?? '"5s"';
    const str = JSON.parse(raw) as string;
    if (str === 'Off') return 0;
    return parseInt(str.replace('s', ''), 10) || 0;
  } catch {
    return 0;
  }
}
