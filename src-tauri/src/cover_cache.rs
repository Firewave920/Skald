use std::path::PathBuf;

use directories::ProjectDirs;

fn cache_dir() -> Option<PathBuf> {
    ProjectDirs::from("com", "skald", "Skald")
        .map(|dirs| dirs.cache_dir().join("covers"))
}

/// Full path where the cover for `item_id` at an optional render `width` would
/// be stored. Sized requests use `{id}_w{width}.jpg` and unsized requests use
/// `{id}.jpg`, so covers fetched at different widths never collide in the cache.
pub fn cache_path(item_id: &str, width: Option<u32>) -> PathBuf {
    let file_name = match width {
        Some(w) => format!("{item_id}_w{w}.jpg"),
        None => format!("{item_id}.jpg"),
    };
    cache_dir()
        .unwrap_or_else(|| PathBuf::from("covers"))
        .join(file_name)
}

/// Returns `true` if the cover at this width is already on disk.
pub fn is_cached(item_id: &str, width: Option<u32>) -> bool {
    cache_path(item_id, width).exists()
}

/// Write `bytes` to the cover cache, creating the directory if needed.
pub fn save_cover(item_id: &str, width: Option<u32>, bytes: &[u8]) -> Result<(), String> {
    let path = cache_path(item_id, width);
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

/// Read and return cached cover bytes.
pub fn load_cover(item_id: &str, width: Option<u32>) -> Result<Vec<u8>, String> {
    let path = cache_path(item_id, width);
    std::fs::read(&path).map_err(|e| format!("cover not cached for {item_id}: {e}"))
}

/// Delete every cached cover variant for `item_id` (`{id}.jpg` and `{id}_w*.jpg`).
/// Called after a cover changes so the next fetch re-downloads the new art.
pub fn clear(item_id: &str) {
    let Some(dir) = cache_dir() else { return };
    let Ok(entries) = std::fs::read_dir(&dir) else { return };
    for entry in entries.flatten() {
        let name = entry.file_name();
        let name = name.to_string_lossy();
        // Matches "{id}.jpg" and "{id}_w{width}.jpg".
        if name == format!("{item_id}.jpg") || name.starts_with(&format!("{item_id}_w")) {
            let _ = std::fs::remove_file(entry.path());
        }
    }
}
