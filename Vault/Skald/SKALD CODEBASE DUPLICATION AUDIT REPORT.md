
---

### **Category 1 — Playback Control Duplication**

| Location                                                 | Calls                                                    | Session state management?                                                          | Routes through playBook?                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/api/playbook.ts`                                    | `closeActiveSession`, `openPlaybackSession`, `playAudio` | ✅ Full teardown + rebuild                                                          | N/A — IS playBook                                                         |
| `Player.tsx handlePlayPause` (two open-session branches) | `openPlaybackSession`, `playAudio`                       | Partial: sets sessionId, sessionReady, but no `setPosition`                        | ✅ Routes through `playBook`                                               |
| `Player.tsx handlePlayFocused`                           | `pauseAudio` only (session open deferred to play button) | Resets sessionId/sessionReady/playing/position to 0                                | Intentionally deferred                                                    |
| `Player.tsx chapter row — different-book branch`         | `playBook(st, focusedBookId!, pos)`                      | ✅ Via playBook                                                                     | ✅                                                                         |
| `Player.tsx chapter row — same-book branch`              | `seekAudio`, `playAudio`                                 | Sets position + playing. No session teardown (same session)                        | N/A — correct, same session                                               |
| `FocusPanel.tsx handleContinue`                          | `playBook`, `pauseAudio`, `playAudio`                    | New-session branch: ✅ via playBook. Resume branch: no state sync                   | ✅ for new session                                                         |
| `buildItemContextMenu.ts — Play Book`                    | `playBook`                                               | ✅ Via playBook                                                                     | ✅                                                                         |
| `MiniPlayer.tsx`                                         | `pauseAudio` or `playAudio`                              | ❌ **No state updates at all** — neither `setPlaying(true)` nor `setPlaying(false)` | ❌ Not routed through playBook                                             |
| `useGlobalShortcuts.ts`                                  | `playAudio`, `pauseAudio`, `seekAudio`                   | Volume/muted updated for volume shortcuts; play/pause relies on `playback-tick`    | MiniPlayer-style toggle — acceptable for resume/pause, not for cold start |

**Recommendation:** Consolidate MiniPlayer's toggle into a tiny `togglePlayback(st)` helper in `src/api/playbook.ts` that calls `pauseAudio/playAudio` and syncs `st.setPlaying`.

---

### **Category 2 — Pause-and-Stop Sequences**

Three distinct patterns found:

**Pattern A — correct: `pauseAudio()` + `st.setPlaying(false)`**

- `Player.tsx:301–302` — sleep timer countdown hits zero
- `Player.tsx:314–315` — sleep-at-chapter-end triggers
- `Player.tsx:322–323` — auto-play-next boundary pause

**Pattern B — `pauseAudio()` alone, no `setPlaying(false)`**

- `FocusPanel.tsx:300` — pause branch of handleContinue
- `MiniPlayer.tsx:59` — toggle button
- `useGlobalShortcuts.ts:68` — keyboard shortcut (relies on `playback-tick` to sync, acceptable but fragile)

**Pattern C — `setPlaying(false)` alone, no `pauseAudio()`**

- `playbook.ts:17` — correct; session teardown in progress, audio will stop
- `Player.tsx handlePlayFocused` — correct; audio was already paused in the preceding `if (st.playing)` block

**Bugs in Pattern B:**

- `FocusPanel.tsx:300` — UI stays in "playing" state visually after pause until next `playback-tick`
- `MiniPlayer.tsx:59` — state never updates; the icon will be wrong until next `playback-tick`

**Recommendation:** Consolidate into `togglePlayback(st)` in `src/api/playbook.ts` that pairs `pauseAudio/playAudio` with `setPlaying`. Fix FocusPanel and MiniPlayer to use it.

---

### **Category 3 — Mute/Volume Logic**

|Location|What it does|
|---|---|
|`VolumeControl.tsx:25`|`st.setMuted(!st.muted)` — **only updates local state, never calls `setAudioVolume`**|
|`useGlobalShortcuts.ts:94–101`|`setAudioVolume(0)` + `stRef.current.setMuted(true)` (mute) / `setAudioVolume(previous * 100)` + `setMuted(false)` (unmute) — **correct: pairs backend and state**|

**Inconsistency:** VolumeControl's mute button only updates the React `st.muted` flag; it never tells LibVLC to actually silence the audio. The keyboard shortcut correctly calls `setAudioVolume(0)`. Clicking the mute button in the toolbar does not actually mute audio output — only the slider display.

**Recommendation:** Extract `muteAudio(st)` and `unmuteAudio(st)` helpers in `src/api/playbook.ts` that pair `setAudioVolume` with `st.setMuted`, and use them in both VolumeControl and useGlobalShortcuts.

---

### **Category 4 — Media Progress Lookup**

Every inline `st.mediaProgress.find(p => p.libraryItemId === ...)`:

|Location|Purpose|
|---|---|
|`playbook.ts:23`|Resume position before opening session|
|`Player.tsx:100`|Focused book's saved chapter position (for chapter list highlight)|
|`Player.tsx:652`|Details panel progress display|
|`buildItemContextMenu.ts:50`|Preserve progress ID on optimistic "mark as finished"|
|`CollectionsView.tsx:16–18`|Filter groups by reading/unread/finished status|
|`NarratorsView.tsx:19–21`|Same filter logic — verbatim duplicate|
|`AuthorsView.tsx:18–20`|Same filter logic — verbatim duplicate|
|`SeriesView.tsx:30–32`|Same filter logic — verbatim duplicate|

The four shelf-tab files contain identical three-line inline filter predicates repeated verbatim. The exported helpers `bookProgress()` and `bookCurrentTime()` in `onyx.ts` already exist and cover the simple cases; the group-filter predicate is not yet extracted.

**Recommendation:** Extract `groupMatchesFilter(books, st)` (it already exists in each tab as a local function — consolidate into `onyx.ts` or a shared `src/lib/shelfFilters.ts`). `playbook.ts` and `Player.tsx` inline lookups are fine as-is.

---

### **Category 5 — Chapter Position Calculation**

All chapter position calculations route through the exported helpers `chapterAt()` and `chapterStart()` from `onyx.ts`. No inline reimplementations found. This category is well-consolidated.

**Recommendation:** No consolidation needed.

---

### **Category 6 — Cover Image URL / Cache Resolution**

All cover fetching goes through a single path: `getCover(serverUrl, itemId)` in `abs.ts` → Tauri command → Rust `cover_cache`. The `Cover.tsx` component is the only consumer; it fetches, converts bytes to a base64 data URI, and renders. No duplicate URL construction or cache access patterns exist outside `Cover.tsx`.

The only observation: `Cover.tsx` re-fetches on every mount (no in-memory deduplication in the frontend), but this hits the Rust cover cache on the second call so it's cheap.

**Recommendation:** No consolidation needed.

---

### **Category 7 — Toast / Notification Triggering**

All `st.setToast()` calls are in `buildItemContextMenu.ts` (5 call sites) and `App.tsx` (dismiss handler). The pattern in `buildItemContextMenu.ts` is consistent:

- Success: `` `Verb "[title]"` `` with `type: 'success'`
- Error: `` `Verb failed: ${String(e)}` `` with `type: 'error'`

No duplication. The messages are all contextually distinct.

**Recommendation:** No consolidation needed.

---

## Priority Summary

|Priority|Finding|Files|
|---|---|---|
|🔴 High|MiniPlayer never updates `st.playing` on toggle|`MiniPlayer.tsx:59`|
|🔴 High|VolumeControl mute button doesn't call `setAudioVolume` — LibVLC is not actually muted|`VolumeControl.tsx:25`|
|🟡 Medium|FocusPanel pause branch skips `st.setPlaying(false)` — state lags until next playback-tick|`FocusPanel.tsx:300`|
|🟡 Medium|`groupMatchesFilter` duplicated verbatim across 4 shelf tab files|`CollectionsView/NarratorsView/AuthorsView/SeriesView`|
|🟢 Low|Extract `togglePlayback()` helper to unify MiniPlayer + FocusPanel resume/pause|`src/api/playbook.ts`|
|🟢 Low|Extract `muteAudio/unmuteAudio` helpers to ensure VolumeControl and shortcuts are consistent|`src/api/playbook.ts`|