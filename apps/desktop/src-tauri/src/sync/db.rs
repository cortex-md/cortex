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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueueRow {
    pub id: String,
    pub op_type: String,
    pub path: String,
    pub extra_data: Option<String>,
    pub priority: u32,
    pub retry_count: u32,
    pub max_retries: u32,
    pub created_at: i64,
    pub next_retry_at: Option<i64>,
    pub last_error: Option<String>,
    pub status: String,
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
            );

            CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY,
                op_type TEXT NOT NULL,
                path TEXT NOT NULL,
                extra_data TEXT,
                priority INTEGER NOT NULL DEFAULT 60,
                retry_count INTEGER NOT NULL DEFAULT 0,
                max_retries INTEGER NOT NULL DEFAULT 10,
                created_at INTEGER NOT NULL,
                next_retry_at INTEGER,
                last_error TEXT,
                status TEXT NOT NULL DEFAULT 'pending'
            );

            CREATE TABLE IF NOT EXISTS sync_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
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

    pub fn enqueue_op(&self, row: &QueueRow) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sync_queue (id, op_type, path, extra_data, priority, retry_count, max_retries, created_at, next_retry_at, last_error, status)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
             ON CONFLICT(id) DO UPDATE SET
                retry_count = excluded.retry_count,
                next_retry_at = excluded.next_retry_at,
                last_error = excluded.last_error,
                status = excluded.status",
            params![
                row.id,
                row.op_type,
                row.path,
                row.extra_data,
                row.priority,
                row.retry_count,
                row.max_retries,
                row.created_at,
                row.next_retry_at,
                row.last_error,
                row.status,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn load_pending_queue(&self, now: i64) -> Result<Vec<QueueRow>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, op_type, path, extra_data, priority, retry_count, max_retries, created_at, next_retry_at, last_error, status
                 FROM sync_queue
                 WHERE status = 'pending' AND (next_retry_at IS NULL OR next_retry_at <= ?1)
                 ORDER BY priority DESC, created_at ASC",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![now], |row| {
                Ok(QueueRow {
                    id: row.get(0)?,
                    op_type: row.get(1)?,
                    path: row.get(2)?,
                    extra_data: row.get(3)?,
                    priority: row.get(4)?,
                    retry_count: row.get(5)?,
                    max_retries: row.get(6)?,
                    created_at: row.get(7)?,
                    next_retry_at: row.get(8)?,
                    last_error: row.get(9)?,
                    status: row.get(10)?,
                })
            })
            .map_err(|e| e.to_string())?;
        let mut result = Vec::new();
        for row in rows {
            result.push(row.map_err(|e| e.to_string())?);
        }
        Ok(result)
    }

    pub fn mark_queue_completed(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn mark_queue_failed(
        &self,
        id: &str,
        error: &str,
        next_retry_at: Option<i64>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sync_queue SET retry_count = retry_count + 1, last_error = ?2, next_retry_at = ?3, status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead' ELSE 'pending' END WHERE id = ?1",
            params![id, error, next_retry_at],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn mark_queue_dead(&self, id: &str, error: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE sync_queue SET status = 'dead', last_error = ?2 WHERE id = ?1",
            params![id, error],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_duplicate_queue_op(&self, op_type: &str, path: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM sync_queue WHERE op_type = ?1 AND path = ?2 AND status = 'pending'",
            params![op_type, path],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn clear_queue(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM sync_queue", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn dead_letter_count(&self) -> Result<usize, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sync_queue WHERE status = 'dead'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count as usize)
    }

    pub fn get_metadata(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT value FROM sync_metadata WHERE key = ?1",
            params![key],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())
    }

    pub fn set_metadata(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO sync_metadata (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn delete_metadata(&self, key: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM sync_metadata WHERE key = ?1", params![key])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
