use std::collections::HashMap;
use std::path::Path;

use serde::Deserialize;
use tauri::{AppHandle, Emitter};

use crate::sync::db::{SyncDb, SyncState};
use crate::sync::downloader::{DownloadResult, Downloader};
use crate::sync::http::SyncHttpClient;
use crate::sync::ignore::{should_ignore, SyncPreferences};
use crate::sync::uploader::Uploader;

const LONG_OFFLINE_THRESHOLD_SECS: i64 = 30 * 24 * 60 * 60;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct ChangeEvent {
    id: i64,
    #[allow(dead_code)]
    vault_id: String,
    event_type: String,
    file_path: String,
    #[allow(dead_code)]
    version: Option<u64>,
    #[allow(dead_code)]
    actor_id: String,
    device_id: String,
    metadata: Option<serde_json::Value>,
    #[allow(dead_code)]
    created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
struct RemoteFileInfo {
    file_path: String,
    checksum: Option<String>,
    #[allow(dead_code)]
    version: Option<u64>,
    #[allow(dead_code)]
    snapshot_id: Option<String>,
    deleted: Option<bool>,
    #[allow(dead_code)]
    size_bytes: Option<u64>,
    #[allow(dead_code)]
    updated_at: Option<String>,
}

struct LocalFileInfo {
    hash: String,
    #[allow(dead_code)]
    size: u64,
}

enum ReconcileAction {
    Download { path: String },
    Upload { path: String },
    Delete { path: String },
    Rename { old_path: String, new_path: String },
}

pub struct Reconciler<'a> {
    app: &'a AppHandle,
    client: &'a SyncHttpClient,
    db: &'a SyncDb,
    vault_id: &'a str,
    vault_path: &'a str,
    vek: &'a [u8; 32],
    own_device_id: String,
    sync_preferences: &'a SyncPreferences,
}

impl<'a> Reconciler<'a> {
    pub fn new(
        app: &'a AppHandle,
        client: &'a SyncHttpClient,
        db: &'a SyncDb,
        vault_id: &'a str,
        vault_path: &'a str,
        vek: &'a [u8; 32],
        sync_preferences: &'a SyncPreferences,
    ) -> Self {
        let own_device_id = crate::device::get_device_id().unwrap_or_default();
        Self {
            app,
            client,
            db,
            vault_id,
            vault_path,
            vek,
            own_device_id,
            sync_preferences,
        }
    }

    pub async fn run(
        &self,
        last_event_id: Option<&str>,
    ) -> Result<Option<String>, String> {
        match last_event_id {
            Some(id) if self.is_short_gap(id)? => self.incremental_reconcile(id).await,
            _ => self.full_reconcile().await,
        }
    }

    fn is_short_gap(&self, last_event_id: &str) -> Result<bool, String> {
        if last_event_id.is_empty() {
            return Ok(false);
        }

        let last_sync_ts = self
            .db
            .get_metadata("last_reconcile_at")?
            .and_then(|v| v.parse::<i64>().ok())
            .unwrap_or(0);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Ok(now - last_sync_ts < LONG_OFFLINE_THRESHOLD_SECS)
    }

    async fn incremental_reconcile(
        &self,
        last_event_id: &str,
    ) -> Result<Option<String>, String> {
        let mut since = last_event_id.to_string();
        let mut latest_event_id = Some(last_event_id.to_string());
        let limit = 100;

        loop {
            let api_path = format!(
                "/sync/v1/vaults/{}/changes?since={}&limit={}",
                self.vault_id, since, limit
            );

            let response = self.client.get(&api_path).await?;
            if !response.status().is_success() {
                let status = response.status().as_u16();
                let body = response.text().await.unwrap_or_default();
                return Err(format!(
                    "Changes endpoint failed: HTTP {}: {}",
                    status, body
                ));
            }

            let events: Vec<ChangeEvent> =
                response.json().await.map_err(|e| e.to_string())?;

            if events.is_empty() {
                break;
            }

            let actions = self.events_to_actions(&events);
            self.execute_actions(&actions).await;

            if let Some(last) = events.last() {
                let new_id = last.id.to_string();
                since = new_id.clone();
                latest_event_id = Some(new_id);
            }

            if events.len() < limit {
                break;
            }
        }

        self.save_reconcile_timestamp()?;

        Ok(latest_event_id)
    }

    async fn full_reconcile(&self) -> Result<Option<String>, String> {
        let remote_files = self.fetch_remote_file_list().await?;
        let local_states = self.db.list_all_sync_states()?;
        let local_disk = self.scan_local_files()?;

        let actions =
            self.compute_full_actions(&remote_files, &local_states, &local_disk);

        self.execute_actions(&actions).await;
        self.save_reconcile_timestamp()?;

        let latest_event_id = self.fetch_latest_event_id().await?;
        Ok(latest_event_id)
    }

    fn events_to_actions(&self, events: &[ChangeEvent]) -> Vec<ReconcileAction> {
        let mut actions = Vec::new();
        let mut seen_paths: HashMap<String, usize> = HashMap::new();

        for event in events {
            if event.device_id == self.own_device_id {
                continue;
            }
            if should_ignore(&event.file_path, self.sync_preferences) {
                continue;
            }

            let action = match event.event_type.as_str() {
                "file_created" | "file_updated" => {
                    Some(ReconcileAction::Download {
                        path: event.file_path.clone(),
                    })
                }
                "file_deleted" => Some(ReconcileAction::Delete {
                    path: event.file_path.clone(),
                }),
                "file_renamed" => {
                    let old_path = event
                        .metadata
                        .as_ref()
                        .and_then(|m| m.get("old_path"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();

                    if old_path.is_empty() {
                        Some(ReconcileAction::Download {
                            path: event.file_path.clone(),
                        })
                    } else {
                        Some(ReconcileAction::Rename {
                            old_path,
                            new_path: event.file_path.clone(),
                        })
                    }
                }
                _ => None,
            };

            if let Some(act) = action {
                let key = match &act {
                    ReconcileAction::Download { path } => path.clone(),
                    ReconcileAction::Upload { path } => path.clone(),
                    ReconcileAction::Delete { path } => path.clone(),
                    ReconcileAction::Rename { new_path, .. } => new_path.clone(),
                };

                if let Some(idx) = seen_paths.get(&key) {
                    actions[*idx] = act;
                } else {
                    seen_paths.insert(key, actions.len());
                    actions.push(act);
                }
            }
        }

        actions
    }

    fn compute_full_actions(
        &self,
        remote_files: &[RemoteFileInfo],
        local_states: &[SyncState],
        local_disk: &HashMap<String, LocalFileInfo>,
    ) -> Vec<ReconcileAction> {
        let mut actions = Vec::new();

        let state_map: HashMap<&str, &SyncState> =
            local_states.iter().map(|s| (s.file_path.as_str(), s)).collect();

        let remote_map: HashMap<&str, &RemoteFileInfo> =
            remote_files.iter().map(|f| (f.file_path.as_str(), f)).collect();

        for remote in remote_files {
            if remote.deleted.unwrap_or(false) {
                continue;
            }
            if should_ignore(&remote.file_path, self.sync_preferences) {
                continue;
            }

            let has_local = local_disk.contains_key(&remote.file_path);
            let db_state = state_map.get(remote.file_path.as_str());

            if !has_local {
                actions.push(ReconcileAction::Download {
                    path: remote.file_path.clone(),
                });
            } else if let Some(local) = local_disk.get(&remote.file_path) {
                let remote_checksum = remote.checksum.as_deref().unwrap_or("");
                if local.hash != remote_checksum {
                    if let Some(state) = db_state {
                        let ancestor = state.ancestor_hash.as_deref();
                        let local_changed =
                            ancestor.map_or(true, |a| a != local.hash);
                        let remote_changed =
                            ancestor.map_or(true, |a| a != remote_checksum);

                        if remote_changed && !local_changed {
                            actions.push(ReconcileAction::Download {
                                path: remote.file_path.clone(),
                            });
                        } else if local_changed && !remote_changed {
                            actions.push(ReconcileAction::Upload {
                                path: remote.file_path.clone(),
                            });
                        } else {
                            actions.push(ReconcileAction::Download {
                                path: remote.file_path.clone(),
                            });
                        }
                    } else {
                        actions.push(ReconcileAction::Download {
                            path: remote.file_path.clone(),
                        });
                    }
                }
            }
        }

        for (path, _) in local_disk {
            if !remote_map.contains_key(path.as_str()) && !should_ignore(path, self.sync_preferences) {
                let db_state = state_map.get(path.as_str());
                if db_state.is_some() {
                    actions.push(ReconcileAction::Delete {
                        path: path.clone(),
                    });
                } else {
                    actions.push(ReconcileAction::Upload {
                        path: path.clone(),
                    });
                }
            }
        }

        actions
    }

    async fn execute_actions(&self, actions: &[ReconcileAction]) {
        for action in actions {
            match action {
                ReconcileAction::Download { path } => {
                    self.emit_file_event(path, "downloading");
                    let downloader = Downloader::new(
                        self.client,
                        self.db,
                        self.vault_id,
                        self.vault_path,
                        self.vek,
                    );
                    match downloader.download_file(path).await {
                        Ok(DownloadResult::Synced) => {
                            self.emit_file_event(path, "synced")
                        }
                        Ok(DownloadResult::Merged) => {
                            self.emit_file_event(path, "merged")
                        }
                        Ok(DownloadResult::Conflict { .. }) => {
                            self.emit_file_event(path, "conflict");
                            let _ = self.app.emit(
                                "sync-conflict",
                                serde_json::json!({ "path": path }),
                            );
                        }
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e))
                        }
                    }
                }
                ReconcileAction::Upload { path } => {
                    self.emit_file_event(path, "uploading");
                    let uploader = Uploader::new(
                        self.client,
                        self.db,
                        self.vault_id,
                        self.vault_path,
                        self.vek,
                    );
                    match uploader.upload_file(path).await {
                        Ok(()) => self.emit_file_event(path, "synced"),
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e))
                        }
                    }
                }
                ReconcileAction::Delete { path } => {
                    self.emit_file_event(path, "deleting");
                    let full_path =
                        Path::new(self.vault_path).join(path);
                    if full_path.exists() {
                        let _ = std::fs::remove_file(&full_path);
                    }
                    let _ = self.db.delete_sync_state(path);
                    self.emit_file_event(path, "deleted");
                }
                ReconcileAction::Rename {
                    old_path,
                    new_path,
                } => {
                    self.emit_file_event(old_path, "renaming");
                    let downloader = Downloader::new(
                        self.client,
                        self.db,
                        self.vault_id,
                        self.vault_path,
                        self.vek,
                    );
                    match downloader.rename_local_file(old_path, new_path).await {
                        Ok(()) => self.emit_file_event(new_path, "synced"),
                        Err(e) => {
                            self.emit_file_event(old_path, &format!("error: {}", e))
                        }
                    }
                }
            }
        }
    }

    async fn fetch_remote_file_list(&self) -> Result<Vec<RemoteFileInfo>, String> {
        let api_path =
            format!("/sync/v1/vaults/{}/files/list", self.vault_id);
        let response = self.client.get(&api_path).await?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            return Err(format!("Failed to list remote files: {}", body));
        }

        let files: Vec<RemoteFileInfo> =
            response.json().await.map_err(|e| e.to_string())?;
        Ok(files)
    }

    fn scan_local_files(&self) -> Result<HashMap<String, LocalFileInfo>, String> {
        let mut files = HashMap::new();
        self.walk_dir(Path::new(self.vault_path), &mut files)?;
        Ok(files)
    }

    fn walk_dir(
        &self,
        dir: &Path,
        files: &mut HashMap<String, LocalFileInfo>,
    ) -> Result<(), String> {
        let entries = std::fs::read_dir(dir).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            let relative = path
                .strip_prefix(self.vault_path)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .to_string();

            if should_ignore(&relative, self.sync_preferences) {
                continue;
            }

            if path.is_dir() {
                self.walk_dir(&path, files)?;
            } else {
                let content = std::fs::read(&path).map_err(|e| e.to_string())?;
                let hash = blake3::hash(&content).to_hex().to_string();
                files.insert(
                    relative,
                    LocalFileInfo {
                        hash,
                        size: content.len() as u64,
                    },
                );
            }
        }
        Ok(())
    }

    async fn fetch_latest_event_id(&self) -> Result<Option<String>, String> {
        let api_path = format!(
            "/sync/v1/vaults/{}/changes?limit=1",
            self.vault_id
        );
        let response = self.client.get(&api_path).await?;
        if !response.status().is_success() {
            return Ok(None);
        }

        let events: Vec<ChangeEvent> =
            response.json().await.map_err(|e| e.to_string())?;
        Ok(events.last().map(|e| e.id.to_string()))
    }

    fn save_reconcile_timestamp(&self) -> Result<(), String> {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;
        self.db
            .set_metadata("last_reconcile_at", &now.to_string())
    }

    fn emit_file_event(&self, path: &str, status: &str) {
        let _ = self.app.emit(
            "sync-file-event",
            serde_json::json!({
                "path": path,
                "status": status,
            }),
        );
    }
}
