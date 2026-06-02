**Phase A — Toggle and preserve current behaviour**

Introduce the `presence.mode` / `livesync.mode` setting (default `'local'`), add the experimental toggle to settings, and formalise the current dot behaviour behind the `'local'` branch. The `'live'` branch is stubbed to fall back to local. Verification: toggle persists; local mode unchanged.

**Phase B — Socket.IO connection foundation**

Add `rust-socketio` (async). Build `connect_socket()` / `disconnect_socket()` with JWT authentication, driven by the toggle and login/logout. This connection is designed from the start as the transport for all live events, not just presence. Log connection lifecycle. Verification: authenticated connection confirmed against the server, clean teardown.

**Phase C — Presence events (first consumer)**

Forward online/offline events to the frontend; dots reflect real presence in live mode. Presence is the simplest event type and proves the event pipeline end to end before we layer on the higher-value sync. Verification: dots update live.

**Phase D — Live progress sync (priority feature)**

This is the core of what you want. Listen for the server's media-progress and session events. When another device (phone, web, another client) updates progress for a book, Skald receives the event and updates its local `mediaProgress` and, if that book is the currently focused or playing book, the player view's position and the Pick it up section update live. Carefully handle the case where the event is for the book Skald itself is actively playing — Skald's own playback position must not be yanked by an echo of its own sync. Verification: play a book on the WebUI or phone, watch Skald's progress for that book update in real time without a refresh; confirm Skald's own active playback is not disrupted by its own progress writes.

**Phase E — Live library sync**

Listen for item added / updated / removed events. The library and shelf update in real time when items change on the server. Verification: add or edit a book on the server, confirm it appears or updates in Skald's library without a restart.

**Phase F — Reconnection and resync hardening (essential for trustworthy live sync)**

Because live sync must be reliable, this phase is critical, not optional. Re-authenticate on reconnect and perform a full resync of `mediaProgress` and library on every reconnect so no missed events leave Skald in a stale state. Handle sleep/wake, network drops, and server restarts. Tear down cleanly on logout/close/toggle-off. Verification: drop network during active sync, restore, confirm Skald resyncs to correct state; sleep/wake test; confirm no orphaned connections.

**Phase G — Polish and guard rails**

Live-connection indicator in the UI, graceful degradation to local mode on any websocket failure, and confirmation that local mode remains the fully functional default. Verification: forced connection failure falls back to local cleanly; toggle-off leaves websocket code inert.

The structure deliberately puts presence first (Phase C) as the simplest proof of the pipeline, then live progress sync (Phase D) as the priority payload, then library sync (Phase E), with hardening (Phase F) treated as essential because live sync is only as good as its recovery behaviour.

We start with Phase A. Where would you like the toggle — the Account settings section, or a new dedicated "Connection" or "Sync" settings area? Given live sync is now a headline feature, a dedicated Sync settings section may be the better home.