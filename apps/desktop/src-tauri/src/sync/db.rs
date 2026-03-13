use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncState {
    pub file_path: String,
    pub local_hash: Option<String>,
    pub remote_hash: Option<String>,
    pub ancestor_hash: Option<String>,
    pub local_mtime: Option<i64>,
    pub remote_mtime: Option<i64>,
    pub sync_status: String,
    pub last_synced_at: Option<i64>,
    pub server_version_id: Option<String>,
}

pub struct SyncDb {
    conn: Mutex<Connection>,
}

impl SyncDb {
    pub fn open(vault_path: &str) -> Result<Self, String> {
        let db_path = Path::new(vault_path).join(".cortex").join("sync.db");
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS sync_state (
                file_path TEXT PRIMARY KEY,
                local_hash TEXT,
                remote_hash TEXT,
                ancestor_hash TEXT,
                local_mtime INTEGER,
                remote_mtime INTEGER,
                sync_status TEXT NOT NULL DEFAULT 'unknown',
                last_synced_at INTEGER,
                server_version_id TEXT
            );",
        )
        .map_err(|e| e.to_string())?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    pub fn get_sync_state(&self, file_path: &str) -> Result<Option<SyncState>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT file_path, local_hash, remote_hash, ancestor_hash, local_mtime, remote_mtime, sync_status, last_synced_at, server_version_id FROM sync_state WHERE file_path = ?1",
            params![file_path],
            |row| {
                Ok(SyncState {
                    file_path: row.get(0)?,
                    local_hash: row.get(1)?,
                    remote_hash: row.get(2)?,
                    ancestor_hash: row.get(3)?,
                    local_mtime: row.get(4)?,
                    remote_mtime: row.get(5)?,
                    sync_status: row.get(6)?,
                    last_synced_at: row.get(7)?,
                    server_version_id: row.get(8)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())
    }

    pub fn upsert_sync_state(&self, state: &SyncState) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sync_state (file_path, local_hash, remote_hash, ancestor_hash, local_mtime, remote_mtime, sync_status, last_synced_at, server_version_id)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT(file_path) DO UPDATE SET
                local_hash = excluded.local_hash,
                remote_hash = excluded.remote_hash,
                ancestor_hash = excluded.ancestor_hash,
                local_mtime = excluded.local_mtime,
                remote_mtime = excluded.remote_mtime,
                sync_status = excluded.sync_status,
                last_synced_at = excluded.last_synced_at,
                server_version_id = excluded.server_version_id",
            params![
                state.file_path,
                state.local_hash,
                state.remote_hash,
                state.ancestor_hash,
                state.local_mtime,
                state.remote_mtime,
                state.sync_status,
                state.last_synced_at,
                state.server_version_id,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_all_sync_states(&self) -> Result<Vec<SyncState>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT file_path, local_hash, remote_hash, ancestor_hash, local_mtime, remote_mtime, sync_status, last_synced_at, server_version_id FROM sync_state")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(SyncState {
                    file_path: row.get(0)?,
                    local_hash: row.get(1)?,
                    remote_hash: row.get(2)?,
                    ancestor_hash: row.get(3)?,
                    local_mtime: row.get(4)?,
                    remote_mtime: row.get(5)?,
                    sync_status: row.get(6)?,
                    last_synced_at: row.get(7)?,
                    server_version_id: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut states = Vec::new();
        for row in rows {
            states.push(row.map_err(|e| e.to_string())?);
        }
        Ok(states)
    }

    pub fn delete_sync_state(&self, file_path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM sync_state WHERE file_path = ?1",
            params![file_path],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }
}
