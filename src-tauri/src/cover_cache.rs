use std::path::PathBuf;

use directories::ProjectDirs;

fn cache_dir() -> Option<PathBuf> {
    ProjectDirs::from("com", "skald", "Skald")
        .map(|dirs| dirs.cache_dir().join("covers"))
}

/// Full path where the cover for `item_id` would be stored.
pub fn cache_path(item_id: &str) -> PathBuf {
    cache_dir()
        .unwrap_or_else(|| PathBuf::from("covers"))
        .join(format!("{item_id}.jpg"))
}

/// Returns `true` if the cover is already on disk.
pub fn is_cached(item_id: &str) -> bool {
    cache_path(item_id).exists()
}

/// Write `bytes` to the cover cache, creating the directory if needed.
pub fn save_cover(item_id: &str, bytes: &[u8]) -> Result<(), String> {
    let path = cache_path(item_id);
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

/// Read and return cached cover bytes.
pub fn load_cover(item_id: &str) -> Result<Vec<u8>, String> {
    let path = cache_path(item_id);
    std::fs::read(&path).map_err(|e| format!("cover not cached for {item_id}: {e}"))
}
