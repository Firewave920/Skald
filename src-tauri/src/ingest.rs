// ingest.rs — file-system organize layer (Local Library roadmap, Phase 3).
//
// Takes a scanned book unit and places it into the managed library tree as
// `<root>/Author/[Series/]Title/`, or — when it can't be identified confidently
// — into `<root>/_Unidentified/<name>/` for the later match flow (Phase 5). This
// module owns only the *placement* (path building, sanitization, copy/move with
// verify-before-delete, collision handling); the decision of where a book goes
// and the catalog rebuild live in catalog.rs.
//
// Safety posture (study §5 #2/#9): copy is the default (originals survive), and
// a cross-volume move copies → verifies size → only then deletes the source.

use serde::Serialize;
use std::path::{Path, PathBuf};

/// Windows reserved device names — a path component equal to one of these
/// (case-insensitive, ignoring extension) is invalid, so we prefix it.
const RESERVED: &[&str] = &[
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
];

/// The outcome of attempting to ingest one book unit. Serialized to the frontend
/// so the import UI can summarize filed vs. quarantined vs. errored.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IngestOutcome {
    pub title: String,
    /// "filed" | "quarantined" | "error".
    pub outcome: String,
    /// Absolute destination directory (empty on error).
    pub target_path: String,
    /// Error detail when outcome == "error".
    pub message: String,
}

/// Make one path component safe for Windows: replace reserved chars and control
/// codes, trim trailing dots/spaces, avoid reserved device names, and cap length.
pub fn sanitize_component(name: &str) -> String {
    let mut s: String = name
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if (c as u32) < 0x20 => '_',
            c => c,
        })
        .collect();

    // Windows forbids trailing dots/spaces on a path component.
    let trimmed = s.trim_matches(|c| c == ' ' || c == '.').to_string();
    s = if trimmed.is_empty() { "_".to_string() } else { trimmed };

    // Reserved device name (compare the stem, case-insensitive).
    let stem = s.split('.').next().unwrap_or(&s).to_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        s = format!("_{s}");
    }

    // Cap per-component length to keep the full path well under MAX_PATH; deep
    // Author/Series/Title nesting is the reason this is conservative.
    if s.chars().count() > 120 {
        s = s.chars().take(120).collect();
    }
    s
}

/// Build the managed destination directory `<root>/Author/[Series/]Title`.
pub fn book_target_dir(root: &Path, author: &str, series: Option<&str>, title: &str) -> PathBuf {
    let mut p = root.join(sanitize_component(author));
    if let Some(s) = series {
        if !s.trim().is_empty() {
            p = p.join(sanitize_component(s));
        }
    }
    p.join(sanitize_component(title))
}

/// If `target` already exists, append " (2)", " (3)", … until a free path is
/// found, so an ingest never clobbers an existing book folder.
pub fn unique_dir(target: PathBuf) -> PathBuf {
    if !target.exists() {
        return target;
    }
    let parent = match target.parent() {
        Some(p) => p.to_path_buf(),
        None => return target,
    };
    let name = target
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("book")
        .to_string();
    for n in 2..1000 {
        let cand = parent.join(format!("{name} ({n})"));
        if !cand.exists() {
            return cand;
        }
    }
    target
}

/// Recursively remove empty subdirectories of `root` (depth-first), leaving
/// `root` itself in place. Used to clean up the folder skeletons left behind in
/// Staging after a move-based distribution (files get moved out; the now-empty
/// `Author/Book/…` folders should not linger).
pub fn prune_empty_dirs(root: &Path) {
    let entries = match std::fs::read_dir(root) {
        Ok(e) => e,
        Err(_) => return,
    };
    for entry in entries.filter_map(|e| e.ok()) {
        let p = entry.path();
        if p.is_dir() {
            // Prune children first, then remove this dir if it became empty.
            prune_empty_dirs(&p);
            let now_empty = std::fs::read_dir(&p)
                .map(|mut it| it.next().is_none())
                .unwrap_or(false);
            if now_empty {
                let _ = std::fs::remove_dir(&p);
            }
        }
    }
}

/// Move or copy the **direct files** of `source_dir` (audio + supplemental; not
/// subdirectories, which are separate book units) into `target_dir`.
///
/// `move_files`: when true, prefer an atomic same-volume rename; on a
/// cross-volume rename failure, copy → verify byte length → delete the source.
/// When false (copy mode), the source is left untouched.
pub fn place_book(source_dir: &Path, target_dir: &Path, move_files: bool) -> Result<(), String> {
    std::fs::create_dir_all(target_dir).map_err(|e| format!("create target dir: {e}"))?;

    for entry in std::fs::read_dir(source_dir).map_err(|e| format!("read source dir: {e}"))? {
        let entry = entry.map_err(|e| format!("read entry: {e}"))?;
        let path = entry.path();
        if !path.is_file() {
            continue; // subfolders are separate book units; never recurse here
        }
        let dest = target_dir.join(entry.file_name());

        if move_files {
            // Fast path: same-volume rename is atomic.
            if std::fs::rename(&path, &dest).is_err() {
                // Cross-volume (or locked) — copy, verify, then delete.
                let copied = std::fs::copy(&path, &dest).map_err(|e| format!("copy (move fallback): {e}"))?;
                let src_len = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(u64::MAX);
                if copied == src_len {
                    let _ = std::fs::remove_file(&path);
                } else {
                    return Err(format!(
                        "verify failed: copied {copied} bytes != source {src_len} for {}",
                        path.display()
                    ));
                }
            }
        } else {
            std::fs::copy(&path, &dest).map_err(|e| format!("copy: {e}"))?;
        }
    }
    Ok(())
}
