# Fixes


# Bugs
- 

- Fix the stupid fucking start from beginning then seek issue. ( The following fix that was applied to the chapter change setting would probably resolve this bug: Open `src-tauri/src/commands.rs`. Find the `open_playback_session` command. It currently calls `POST /api/items/{id}/play` with a body that does not include `startTime`. Update the body to accept and include an optional `start_time: Option<f64>` parameter:

rust

```rust
#[tauri::command]
pub async fn open_playback_session(
    item_id: String,
    start_time: Option<f64>,
    // existing state params
) -> Result<PlaybackSession, String> {
    let mut body = serde_json::json!({
        // existing fields
    });
    if let Some(t) = start_time {
        body["startTime"] = serde_json::json!(t);
    }
    // rest of request unchanged
}
```

Update the typed wrapper in `src/api/abs.ts` to accept an optional `startTime?: number` second parameter and pass it through.

Then open `src/screens/Player.tsx`. In the chapter click handler for the case where `focusedBookId !== currentBookId`:

1. Pass `chapterStart` as `startTime` to `openPlaybackSession` — the server will begin the session at that position.
2. Remove the `setTimeout` delay entirely.
3. Remove the `seekAudio` call entirely — it is no longer needed.
4. Keep `playAudio()` and the state updates.)


- Apply the resize logic to the focus pane on the library view.

# Features
- See if we can add right click for context menus. Otherwise add a button to manage items.
- Figure out a way to add mass items to collections
- 

# Items that need claude design touches
	- Login page
	- match page
	- add to collection page
	- Context menu
	- Files context menu
	- mini player
	- 