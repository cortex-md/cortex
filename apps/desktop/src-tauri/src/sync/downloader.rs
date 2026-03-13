use std::path::Path;

use crate::sync::crypto;
use crate::sync::db::{SyncDb, SyncState};
use crate::sync::http::SyncHttpClient;

pub struct Downloader<'a> {
    client: &'a SyncHttpClient,
    db: &'a SyncDb,
    vault_id: &'a str,
    vault_path: &'a str,
    vek: &'a [u8; 32],
}

impl<'a> Downloader<'a> {
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

    pub async fn download_file(&self, file_path: &str) -> Result<(), String> {
        let api_path = format!(
            "/sync/v1/vaults/{}/files?path={}",
            self.vault_id,
            urlencoded(file_path)
        );

        let response = self.client.get(&api_path).await?;
        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!(
                "Download failed: HTTP {}: {}",
                status.as_u16(),
                body
            ));
        }

        let encrypted = response.bytes().await.map_err(|e| e.to_string())?;
        let plaintext = crypto::decrypt(&encrypted, self.vek)?;
        let remote_hash = blake3::hash(&plaintext).to_hex().to_string();

        let full_path = Path::new(self.vault_path).join(file_path);
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&full_path, &plaintext).map_err(|e| e.to_string())?;

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.db.upsert_sync_state(&SyncState {
            file_path: file_path.to_string(),
            local_hash: Some(remote_hash.clone()),
            remote_hash: Some(remote_hash),
            ancestor_hash: None,
            local_mtime: Some(now),
            remote_mtime: Some(now),
            sync_status: "synced".to_string(),
            last_synced_at: Some(now),
            server_version_id: None,
        })?;

        Ok(())
    }

    pub async fn delete_local_file(&self, file_path: &str) -> Result<(), String> {
        let full_path = Path::new(self.vault_path).join(file_path);
        if full_path.exists() {
            std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;
        }
        self.db.delete_sync_state(file_path)?;
        Ok(())
    }

    pub async fn rename_local_file(
        &self,
        old_path: &str,
        new_path: &str,
    ) -> Result<(), String> {
        let old_full = Path::new(self.vault_path).join(old_path);
        let new_full = Path::new(self.vault_path).join(new_path);
        if let Some(parent) = new_full.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if old_full.exists() {
            std::fs::rename(&old_full, &new_full).map_err(|e| e.to_string())?;
        }

        if let Some(mut state) = self.db.get_sync_state(old_path)? {
            self.db.delete_sync_state(old_path)?;
            state.file_path = new_path.to_string();
            self.db.upsert_sync_state(&state)?;
        }

        Ok(())
    }
}

fn urlencoded(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('#', "%23")
        .replace('&', "%26")
        .replace('?', "%3F")
}
