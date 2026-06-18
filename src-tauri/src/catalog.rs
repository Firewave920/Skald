// catalog.rs — local library catalog backed by SQLite (rusqlite).
// (Local Library & Split Libraries roadmap, Phase 2.)
//
// Stores local libraries and their scanned items so a folder on disk becomes a
// first-class library that lists alongside ABS libraries in the switcher. Items
// are stored as the same ABS-shaped LibraryItem JSON the scanner emits, so the
// frontend renders them with no special-casing.
//
// Each call opens its own connection (SQLite open is cheap for a local file),
// which keeps every catalog function self-contained and safe to run inside
// `spawn_blocking`. Future phases add progress/sessions/bookmarks/collections/
// playlists tables via additional CREATE TABLE IF NOT EXISTS statements here.

use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::path::PathBuf;

use crate::scanner;

fn now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

/// `<data_local>/Skald/catalog.db` — sibling to the downloads directory.
fn db_path() -> Result<PathBuf, String> {
    directories::ProjectDirs::from("com", "skald", "Skald")
        .map(|d| d.data_local_dir().join("catalog.db"))
        .ok_or_else(|| "Could not resolve catalog path".to_string())
}

/// Open the catalog DB, creating the parent dir and schema on first use.
fn open() -> Result<Connection, String> {
    let path = db_path()?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("create catalog dir: {e}"))?;
    }
    let conn = Connection::open(&path).map_err(|e| format!("open catalog: {e}"))?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         CREATE TABLE IF NOT EXISTS libraries (
            id                TEXT PRIMARY KEY,
            name              TEXT NOT NULL,
            media_type        TEXT NOT NULL DEFAULT 'book',
            root_path         TEXT NOT NULL,
            staging_path      TEXT,
            unidentified_path TEXT,
            organize_mode     TEXT NOT NULL DEFAULT 'copy',
            region            TEXT,
            created_at        INTEGER NOT NULL
         );
         CREATE TABLE IF NOT EXISTS items (
            id          TEXT PRIMARY KEY,
            library_id  TEXT NOT NULL,
            source_path TEXT,
            item_json   TEXT NOT NULL,
            confidence  INTEGER NOT NULL DEFAULT 0,
            identified  INTEGER NOT NULL DEFAULT 0,
            added_at    INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_items_library ON items(library_id);",
    )
    .map_err(|e| format!("init schema: {e}"))
}

/// Deterministic id from the root path so re-creating the same library is idempotent.
fn stable_lib_id(root_path: &str) -> String {
    use std::hash::{Hash, Hasher};
    let mut h = std::collections::hash_map::DefaultHasher::new();
    root_path.hash(&mut h);
    format!("local_lib_{:016x}", h.finish())
}

/// Build the frontend-facing Library JSON for a local library row. `source:
/// "local"` is the routing tag the frontend branches on; the other fields keep
/// the shape parity the existing `Library` interface expects.
fn library_json(id: &str, name: &str, media_type: &str, root_path: &str, created_at: i64) -> Value {
    json!({
        "id": id,
        "name": name,
        "mediaType": media_type,
        "source": "local",
        "icon": Value::Null,
        "provider": Value::Null,
        "displayOrder": Value::Null,
        "folders": [ { "id": Value::Null, "fullPath": root_path, "libraryId": id, "addedAt": Value::Null } ],
        "settings": Value::Null,
        "lastScan": Value::Null,
        "createdAt": created_at,
        "lastUpdate": Value::Null,
    })
}

fn get_library(conn: &Connection, id: &str) -> Result<Value, String> {
    conn.query_row(
        "SELECT id, name, media_type, root_path, created_at FROM libraries WHERE id = ?1",
        params![id],
        |r| {
            Ok(library_json(
                &r.get::<_, String>(0)?,
                &r.get::<_, String>(1)?,
                &r.get::<_, String>(2)?,
                &r.get::<_, String>(3)?,
                r.get::<_, i64>(4)?,
            ))
        },
    )
    .map_err(|e| format!("get library: {e}"))
}

/// Create (or return the existing) local library rooted at `root_path`.
pub fn create_library(name: &str, root_path: &str) -> Result<Value, String> {
    let conn = open()?;
    let id = stable_lib_id(root_path);
    conn.execute(
        "INSERT OR IGNORE INTO libraries (id, name, media_type, root_path, organize_mode, created_at)
         VALUES (?1, ?2, 'book', ?3, 'copy', ?4)",
        params![id, name, root_path, now_ms()],
    )
    .map_err(|e| format!("create library: {e}"))?;
    log::info!(target: "skald::library", "catalog: create library id={id} root={root_path}");
    get_library(&conn, &id)
}

pub fn list_libraries() -> Result<Vec<Value>, String> {
    let conn = open()?;
    let mut stmt = conn
        .prepare("SELECT id, name, media_type, root_path, created_at FROM libraries ORDER BY name")
        .map_err(|e| format!("list libraries: {e}"))?;
    let rows = stmt
        .query_map([], |r| {
            Ok(library_json(
                &r.get::<_, String>(0)?,
                &r.get::<_, String>(1)?,
                &r.get::<_, String>(2)?,
                &r.get::<_, String>(3)?,
                r.get::<_, i64>(4)?,
            ))
        })
        .map_err(|e| format!("list libraries query: {e}"))?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("list libraries collect: {e}"))
}

pub fn delete_library(id: &str) -> Result<(), String> {
    let conn = open()?;
    conn.execute("DELETE FROM items WHERE library_id = ?1", params![id])
        .map_err(|e| format!("delete library items: {e}"))?;
    conn.execute("DELETE FROM libraries WHERE id = ?1", params![id])
        .map_err(|e| format!("delete library: {e}"))?;
    log::info!(target: "skald::library", "catalog: delete library id={id}");
    Ok(())
}

fn library_root(conn: &Connection, id: &str) -> Result<String, String> {
    conn.query_row(
        "SELECT root_path FROM libraries WHERE id = ?1",
        params![id],
        |r| r.get::<_, String>(0),
    )
    .map_err(|e| format!("library root lookup: {e}"))
}

/// Full re-scan: clear the library's items, scan its root, store fresh items.
/// Returns the number of items catalogued. Blocking — call from `spawn_blocking`.
pub fn scan_library(library_id: &str) -> Result<usize, String> {
    let conn = open()?;
    let root = library_root(&conn, library_id)?;
    let scanned = scanner::scan_folder(&root, library_id)?;

    // Single transaction so a re-scan is atomic (no window where the library
    // appears empty mid-rebuild).
    let tx = conn.unchecked_transaction().map_err(|e| format!("tx: {e}"))?;
    tx.execute("DELETE FROM items WHERE library_id = ?1", params![library_id])
        .map_err(|e| format!("clear items: {e}"))?;
    let now = now_ms();
    for s in &scanned {
        let item_id = s.item.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let item_str = serde_json::to_string(&s.item).map_err(|e| format!("serialize item: {e}"))?;
        tx.execute(
            "INSERT OR REPLACE INTO items
                (id, library_id, source_path, item_json, confidence, identified, added_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![item_id, library_id, s.source_path, item_str, s.confidence as i64, s.identified as i64, now],
        )
        .map_err(|e| format!("insert item: {e}"))?;
    }
    tx.commit().map_err(|e| format!("commit: {e}"))?;
    log::info!(target: "skald::library", "catalog: scanned library {library_id} items={}", scanned.len());
    Ok(scanned.len())
}

pub fn list_items(library_id: &str) -> Result<Vec<Value>, String> {
    let conn = open()?;
    let mut stmt = conn
        .prepare("SELECT item_json FROM items WHERE library_id = ?1")
        .map_err(|e| format!("list items: {e}"))?;
    let rows = stmt
        .query_map(params![library_id], |r| r.get::<_, String>(0))
        .map_err(|e| format!("list items query: {e}"))?;
    let mut out = Vec::new();
    for row in rows {
        let s = row.map_err(|e| format!("row: {e}"))?;
        match serde_json::from_str::<Value>(&s) {
            Ok(v) => out.push(v),
            Err(e) => log::warn!(target: "skald::library", "catalog: bad item_json ({e})"),
        }
    }
    Ok(out)
}
