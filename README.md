# Skald

A native **Windows desktop client for [Audiobookshelf](https://www.audiobookshelf.org/)** — and a standalone, server-free audiobook & podcast player.

Skald connects to your Audiobookshelf server for streaming, offline playback, library browsing, live progress sync, and (for admins) server management. It can also build and play **local libraries straight from folders on disk with no server at all**, and subscribe to **podcasts by RSS** — both alongside your ABS libraries in one switcher.

Built with **Tauri 2 + React 19 + TypeScript + Rust**, with audio handled natively by **LibVLC**. The UI follows a bespoke design language called *Onyx*.

> **Status:** working alpha. The app authenticates (password or API key), streams and plays audio, syncs progress live over Socket.IO, downloads for offline use, and ships a broad settings surface. Target platform is **Windows 11 x64**; Linux is a future second-class target (see `linux-roadmap.md`).

---

## Features

- **Audiobookshelf client** — password / API-key login (tokens stored in Windows Credential Manager), library browse (grid/list, Series / Authors / Narrators / Collections / Playlists / Genres / Publishers, 3D cover layouts), advanced filter + scoped search.
- **Player** — waveform scrubber, chapter navigation, variable speed, sleep timer, bookmarks, and an audiobook-tuned equalizer. Gapless multi-file/multi-track books.
- **Live sync** — 30-second session sync over Socket.IO with reconnect resync and cross-device progress reconciliation.
- **Offline** — download books for offline playback with a local progress queue that flushes back to the server on reconnect.
- **Local libraries (no server)** — scan folders on disk into a catalog, organize into Author/Series/Title, match metadata against Google Books / iTunes / Open Library, and play with catalog-backed progress, resume, and bookmarks. A staging-folder watcher auto-imports new drops.
- **Local podcasts (no server)** — subscribe by RSS or OPML, browse and download episodes, per-episode progress, and an auto-download scheduler.
- **Admin** — library management, server settings, notifications (Apprise), backups, scheduled-tasks monitor, server log viewer, user management, item metadata + chapter editor, cover management, custom metadata providers, and per-item public share links / RSS feeds.
- **Personalisation** — theme / accent / scale, customizable keyboard shortcuts, and Open Library review enrichment.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript (~5.8), Vite 7 |
| Desktop shell | Tauri 2 (`opener`, `dialog`, `global-shortcut`, `log` plugins) |
| Backend | Rust (edition 2021), `reqwest` + `tokio` |
| Audio | LibVLC via `vlc-rs` |
| Live sync | `rust_socketio` (Socket.IO) |
| Token storage | `keyring` → Windows Credential Manager |
| Local catalog | SQLite via `rusqlite` |

---

## Building from source

Skald standardizes on **pnpm**.

### Prerequisites

- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/tools/install) (stable, MSVC toolchain)
- Tauri 2 prerequisites for Windows (WebView2, Visual Studio Build Tools)

### Bundled runtime (not committed — populate locally)

Two directories are **git-ignored** and must be filled before a build, because `build.rs` copies their contents next to the binary and the bundler packages them as resources:

- `src-tauri/vlc-dist/` — `libvlc.dll`, `libvlccore.dll`, `vlc-cache-gen.exe`, and the `plugins/` tree from a VLC installation.
- `src-tauri/bin/` — `ffprobe.exe` (reads metadata/chapters) and `tone.exe` (writes metadata).

### Commands

```bash
pnpm install            # install Node dependencies
pnpm tauri dev          # development build with HMR
pnpm tauri build        # production NSIS installer (Windows)
pnpm exec tsc --noEmit  # frontend type-check (safe while the app is running)
```

> **Note:** `build.rs` copies the VLC DLLs at build time and will fail with an OS "file in use" error if Skald is already running. Stop the app before running `cargo` / `tauri build`.

---

## License

Skald is licensed under the **GNU General Public License v3.0** — see [`LICENSE`](LICENSE).

## Acknowledgements & trademarks

Skald is an **unofficial, third-party client** and is **not affiliated with, sponsored by, or endorsed by the Audiobookshelf project.** "Audiobookshelf" is the name of that separate project, used here only to describe compatibility, in accordance with its [third-party app guidelines](https://audiobookshelf.org/docs/faq/app/). Skald uses its own name and icon and does not use the Audiobookshelf logo.
