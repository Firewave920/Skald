Read the entire roadmap on Vault\Skald\Skald Download Implementation Roadmap.md prior to execution and get adetailed understanding of the overall objective. Consider actions holistically rather than just trying to complete the next step.

**Phase F: Storage management and downloads settings**

Comment every block and non-obvious line.

**Part 1 — Wire real data into Downloads settings:**

Open `src/components/settings/DownloadsSection.tsx`. The section currently has WIP placeholders. Replace them with real content:

1. **Cache location row** — already implemented with the Reveal button. Confirm it still works and leave it unchanged.
2. **Storage used** — in the section header, show the total size of all downloads from the registry. Calculate by summing `record.fileSize` across all `DownloadRecord` entries from `getDownloads()`. Format as MB or GB to one decimal place.
3. **Downloads list** — a scrollable list of Glass rows, one per downloaded book. Each row:
    - Book cover thumbnail (40px × 40px, from cover cache)
    - Book title in 14px body text
    - Author in 11px muted text below title
    - File size formatted as MB/GB
    - Download date as relative time (e.g. `2 days ago`)
    - A delete button (trash icon) that calls `removeDownload(record.itemId)` with a `ConfirmDialog` before deletion, then refreshes the list
4. **Maximum cache size** row — remove the WIP badge. Show the current total used vs no limit. Add a note: `"No limit set — manage individual downloads below."` This is sufficient for v0.1.0; a configurable limit can be a future feature.
5. **Auto-download next book in series** row — keep WIP badge. Leave as-is.
6. **Keep downloaded books after finishing** row — keep WIP badge. Leave as-is.
7. **Clear all downloads** button — wire it to call `removeDownload` for every entry in the registry in sequence, with a single `ConfirmDialog` warning: `"This will delete all downloaded audio files from your device. This cannot be undone."`. Show a success toast when complete.

**Part 2 — Refresh downloads list after delete:**

Ensure that after any individual or bulk delete, the downloads list and storage total both refresh immediately without requiring a page navigation.

**Part 3 — Show download count in nav:**

Open `src/screens/Settings.tsx`. In the Downloads nav item label, append a count badge showing how many books are downloaded — e.g. `Downloads (3)`. Read from `st.downloads.length`. Show nothing when zero.

After completing, run `pnpm tauri dev`, navigate to Settings → Downloads, and confirm:

- The storage total shows the correct sum
- Each downloaded book appears with title, size, and date
- Deleting a book removes the file and updates the list and total
- Clear all works with confirmation
- The nav badge shows the correct count

Then commit with the message: `feat(downloads): Phase F — wire Downloads settings with real registry data, delete, and storage total`



