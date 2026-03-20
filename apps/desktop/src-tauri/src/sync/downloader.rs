use std::path::Path;

use crate::sync::conflict::{self, AutoMergeResult};
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

    pub async fn download_file(&self, file_path: &str) -> Result<DownloadResult, String> {
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

        let snapshot_id = response
            .headers()
            .get("X-Snapshot-ID")
            .and_then(|v| v.to_str().ok())
            .map(|s| s.to_string());

        let encrypted = response.bytes().await.map_err(|e| e.to_string())?;
        let plaintext = crypto::decrypt(&encrypted, self.vek)?;
        let remote_hash = blake3::hash(&plaintext).to_hex().to_string();

        let full_path = Path::new(self.vault_path).join(file_path);
        let existing_state = self.db.get_sync_state(file_path)?;

        if full_path.exists() {
            if let Some(ref state) = existing_state {
                let local_content = std::fs::read(&full_path).map_err(|e| e.to_string())?;
                let local_hash = blake3::hash(&local_content).to_hex().to_string();

                if local_hash == remote_hash {
                    self.update_state_synced(file_path, &remote_hash, snapshot_id.clone())?;
                    return Ok(DownloadResult::Synced);
                }

                let detection = conflict::detect(
                    Some(&local_hash),
                    Some(&remote_hash),
                    state.ancestor_hash.as_deref(),
                );

                match detection {
                    conflict::DetectResult::Conflict => {
                        let resolver = conflict::ConflictResolver::new(
                            self.client,
                            self.db,
                            self.vault_id,
                            self.vault_path,
                            self.vek,
                        );

                        match resolver
                            .attempt_auto_merge(file_path, &local_content, &plaintext, state)
                            .await?
                        {
                            AutoMergeResult::KeepLocal => {
                                return Ok(DownloadResult::Synced);
                            }
                            AutoMergeResult::KeepRemote(content) => {
                                self.write_and_update(
                                    file_path,
                                    &content,
                                    &remote_hash,
                                    snapshot_id,
                                )?;
                                return Ok(DownloadResult::Synced);
                            }
                            AutoMergeResult::Merged(merged) => {
                                let merged_hash = blake3::hash(&merged).to_hex().to_string();
                                self.write_and_update(
                                    file_path,
                                    &merged,
                                    &merged_hash,
                                    snapshot_id,
                                )?;
                                return Ok(DownloadResult::Merged);
                            }
                            AutoMergeResult::NeedsManualResolution {
                                local_text,
                                remote_text,
                                conflict_text,
                            } => {
                                std::fs::write(&full_path, conflict_text.as_bytes())
                                    .map_err(|e| e.to_string())?;

                                let now = std::time::SystemTime::now()
                                    .duration_since(std::time::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs() as i64;

                                self.db.upsert_sync_state(&SyncState {
                                    file_path: file_path.to_string(),
                                    local_hash: Some(local_hash),
                                    remote_hash: Some(remote_hash),
                                    ancestor_hash: state.ancestor_hash.clone(),
                                    local_mtime: Some(now),
                                    remote_mtime: Some(now),
                                    sync_status: "conflict".to_string(),
                                    last_synced_at: state.last_synced_at,
                                    server_version_id: snapshot_id,
                                })?;

                                return Ok(DownloadResult::Conflict {
                                    local_text,
                                    remote_text,
                                });
                            }
                        }
                    }
                    conflict::DetectResult::LocalOnly => {
                        return Ok(DownloadResult::Synced);
                    }
                    _ => {}
                }
            }
        }

        self.write_and_update(file_path, &plaintext, &remote_hash, snapshot_id)?;
        Ok(DownloadResult::Synced)
    }

    pub async fn download_version(
        &self,
        file_path: &str,
        version: &str,
    ) -> Result<Vec<u8>, String> {
        let api_path = format!(
            "/sync/v1/vaults/{}/files?path={}&version={}",
            self.vault_id,
            urlencoded(file_path),
            version
        );

        let response = self.client.get(&api_path).await?;
        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Download version failed: {}", body));
        }

        let encrypted = response.bytes().await.map_err(|e| e.to_string())?;
        crypto::decrypt(&encrypted, self.vek)
    }

    pub async fn get_version_history(&self, file_path: &str) -> Result<Vec<VersionInfo>, String> {
        let api_path = format!(
            "/sync/v1/vaults/{}/files/history?path={}",
            self.vault_id,
            urlencoded(file_path)
        );

        let response = self.client.get(&api_path).await?;
        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Version history failed: {}", body));
        }

        let versions: Vec<VersionInfo> = response.json().await.map_err(|e| e.to_string())?;
        Ok(versions)
    }

    fn write_and_update(
        &self,
        file_path: &str,
        content: &[u8],
        hash: &str,
        snapshot_id: Option<String>,
    ) -> Result<(), String> {
        let full_path = Path::new(self.vault_path).join(file_path);
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&full_path, content).map_err(|e| e.to_string())?;
        self.update_state_synced(file_path, hash, snapshot_id)
    }

    fn update_state_synced(
        &self,
        file_path: &str,
        hash: &str,
        snapshot_id: Option<String>,
    ) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        self.db.upsert_sync_state(&SyncState {
            file_path: file_path.to_string(),
            local_hash: Some(hash.to_string()),
            remote_hash: Some(hash.to_string()),
            ancestor_hash: Some(hash.to_string()),
            local_mtime: Some(now),
            remote_mtime: Some(now),
            sync_status: "synced".to_string(),
            last_synced_at: Some(now),
            server_version_id: snapshot_id,
        })
    }

    pub async fn delete_local_file(&self, file_path: &str) -> Result<(), String> {
        let full_path = Path::new(self.vault_path).join(file_path);
        if full_path.exists() {
            std::fs::remove_file(&full_path).map_err(|e| e.to_string())?;
        }
        self.db.delete_sync_state(file_path)?;
        Ok(())
    }

    pub async fn rename_local_file(&self, old_path: &str, new_path: &str) -> Result<(), String> {
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

pub enum DownloadResult {
    Synced,
    Merged,
    Conflict {
        #[allow(dead_code)]
        local_text: String,
        #[allow(dead_code)]
        remote_text: String,
    },
}

#[derive(Debug, serde::Deserialize, serde::Serialize, Clone)]
#[serde(rename_all(serialize = "camelCase", deserialize = "snake_case"))]
pub struct VersionInfo {
    pub snapshot_id: String,
    pub version: u64,
    pub size_bytes: Option<u64>,
    pub checksum: Option<String>,
    pub author_id: Option<String>,
    pub author_name: Option<String>,
    pub device_id: Option<String>,
    pub device_name: Option<String>,
    pub created_at: Option<String>,
}

fn urlencoded(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('#', "%23")
        .replace('&', "%26")
        .replace('?', "%3F")
}
