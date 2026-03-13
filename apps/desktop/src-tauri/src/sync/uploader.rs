use std::path::Path;

use crate::sync::crypto;
use crate::sync::db::{SyncDb, SyncState};
use crate::sync::http::SyncHttpClient;

pub struct Uploader<'a> {
    client: &'a SyncHttpClient,
    db: &'a SyncDb,
    vault_id: &'a str,
    vault_path: &'a str,
    vek: &'a [u8; 32],
}

impl<'a> Uploader<'a> {
    pub fn new(
        client: &'a SyncHttpClient,
        db: &'a SyncDb,
        vault_id: &'a str,
        vault_path: &'a str,
        vek: &'a [u8; 32],
    ) -> Self {
        Self {
            client,
            db,
            vault_id,
            vault_path,
            vek,
        }
    }

    pub async fn upload_file(&self, file_path: &str) -> Result<(), String> {
        let full_path = Path::new(self.vault_path).join(file_path);
        let content = std::fs::read(&full_path).map_err(|e| e.to_string())?;
        let local_hash = blake3::hash(&content).to_hex().to_string();

        if let Some(sync_state) = self.db.get_sync_state(file_path)? {
            if sync_state.local_hash.as_deref() == Some(&local_hash) {
                return Ok(());
            }
        }

        let encrypted = crypto::encrypt(&content, self.vek)?;
        let api_path = format!("/sync/v1/vaults/{}/files", self.vault_id);

        let headers = vec![
            ("X-File-Path".to_string(), file_path.to_string()),
            ("X-Local-Hash".to_string(), local_hash.clone()),
            (
                "Content-Type".to_string(),
                "application/octet-stream".to_string(),
            ),
        ];

        let response = self.client.post_bytes(&api_path, encrypted, headers).await?;
        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Upload failed: HTTP {}: {}", status.as_u16(), body));
        }

        let response_body: serde_json::Value =
            response.json().await.map_err(|e| e.to_string())?;
        let snapshot_id = response_body["snapshot_id"]
            .as_str()
            .map(|s| s.to_string());

        let mtime = std::fs::metadata(&full_path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs() as i64);

        self.db.upsert_sync_state(&SyncState {
            file_path: file_path.to_string(),
            local_hash: Some(local_hash.clone()),
            remote_hash: Some(local_hash.clone()),
            ancestor_hash: Some(local_hash),
            local_mtime: mtime,
            remote_mtime: mtime,
            sync_status: "synced".to_string(),
            last_synced_at: Some(
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs() as i64,
            ),
            server_version_id: snapshot_id,
        })?;

        Ok(())
    }
}
