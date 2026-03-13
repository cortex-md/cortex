use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;

use crate::sync::crypto;
use crate::sync::db::SyncDb;
use crate::sync::downloader::Downloader;
use crate::sync::ignore::should_ignore;
use crate::sync::queue::{SyncOp, SyncQueue};
use crate::sync::sse::SseClient;
use crate::sync::state::{SyncCommand, SyncEngineState};
use crate::sync::uploader::Uploader;

const UPLOAD_DEBOUNCE: Duration = Duration::from_secs(5);

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncStateEvent {
    state: SyncEngineState,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncFileEvent {
    path: String,
    status: String,
}

pub struct SyncEngine {
    app: AppHandle,
    state: SyncEngineState,
    queue: SyncQueue,
    vault_id: Option<String>,
    vault_path: Option<String>,
    server_url: Option<String>,
    db: Option<Arc<SyncDb>>,
    vek: Option<[u8; 32]>,
    pending_uploads: HashMap<String, Instant>,
}

impl SyncEngine {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            state: SyncEngineState::Idle,
            queue: SyncQueue::new(),
            vault_id: None,
            vault_path: None,
            server_url: None,
            db: None,
            vek: None,
            pending_uploads: HashMap::new(),
        }
    }

    fn set_state(&mut self, new_state: SyncEngineState) {
        if self.state != new_state {
            self.state = new_state.clone();
            let _ = self
                .app
                .emit("sync-state-changed", SyncStateEvent { state: new_state });
        }
    }

    fn emit_file_event(&self, path: &str, status: &str) {
        let _ = self.app.emit(
            "sync-file-event",
            SyncFileEvent {
                path: path.to_string(),
                status: status.to_string(),
            },
        );
    }

    fn get_http_client(&self) -> Option<&SyncHttpClient> {
        self.app.try_state::<SyncHttpClient>().map(|s| &*s)
    }

    pub async fn run(mut self, mut rx: mpsc::Receiver<SyncCommand>) {
        let mut debounce_interval = tokio::time::interval(Duration::from_secs(1));

        loop {
            tokio::select! {
                cmd = rx.recv() => {
                    match cmd {
                        Some(SyncCommand::Start { vault_id, vault_path, server_url }) => {
                            self.set_state(SyncEngineState::Connecting);

                            match SyncDb::open(&vault_path) {
                                Ok(db) => self.db = Some(Arc::new(db)),
                                Err(e) => {
                                    self.emit_file_event("", &format!("db-error: {}", e));
                                    self.set_state(SyncEngineState::Idle);
                                    continue;
                                }
                            }

                            match crypto::get_or_create_vek(&vault_id) {
                                Ok(vek) => self.vek = Some(vek),
                                Err(e) => {
                                    self.emit_file_event("", &format!("vek-error: {}", e));
                                    self.set_state(SyncEngineState::Idle);
                                    continue;
                                }
                            }

                            self.vault_id = Some(vault_id);
                            self.vault_path = Some(vault_path);
                            self.server_url = Some(server_url);

                            self.start_sse_listener();
                            self.set_state(SyncEngineState::Live);
                        }
                        Some(SyncCommand::Stop) => {
                            self.vault_id = None;
                            self.vault_path = None;
                            self.server_url = None;
                            self.db = None;
                            self.vek = None;
                            self.pending_uploads.clear();
                            self.set_state(SyncEngineState::Idle);
                        }
                        Some(SyncCommand::LocalFileChanged { path }) => {
                            if !should_ignore(&path) {
                                let relative = self.to_relative_path(&path);
                                self.pending_uploads.insert(relative, Instant::now());
                            }
                        }
                        Some(SyncCommand::ForceSyncFile { path }) => {
                            let relative = self.to_relative_path(&path);
                            self.pending_uploads.remove(&relative);
                            let (op, priority) = SyncQueue::upload(relative);
                            self.queue.push(op, priority);
                        }
                        Some(SyncCommand::RemoteFileChanged { path, version }) => {
                            let (op, priority) = SyncQueue::download(path, version);
                            self.queue.push(op, priority);
                        }
                        Some(SyncCommand::RemoteFileDeleted { path }) => {
                            self.queue.push(SyncOp::Delete { path }, 80);
                        }
                        Some(SyncCommand::RemoteFileRenamed { old_path, new_path }) => {
                            self.queue.push(SyncOp::Rename { old_path, new_path }, 80);
                        }
                        None => break,
                    }
                }
                _ = debounce_interval.tick() => {
                    let now = Instant::now();
                    let ready: Vec<String> = self.pending_uploads
                        .iter()
                        .filter(|(_, when)| now.duration_since(**when) >= UPLOAD_DEBOUNCE)
                        .map(|(path, _)| path.clone())
                        .collect();

                    for path in ready {
                        self.pending_uploads.remove(&path);
                        let (op, priority) = SyncQueue::upload(path);
                        self.queue.push(op, priority);
                    }
                }
            }

            self.process_queue().await;
        }
    }

    fn to_relative_path(&self, absolute_path: &str) -> String {
        if let Some(ref vault_path) = self.vault_path {
            let prefix = if vault_path.ends_with('/') {
                vault_path.clone()
            } else {
                format!("{}/", vault_path)
            };
            if absolute_path.starts_with(&prefix) {
                return absolute_path[prefix.len()..].to_string();
            }
        }
        absolute_path.to_string()
    }

    fn start_sse_listener(&self) {
        let Some(ref vault_id) = self.vault_id else {
            return;
        };
        let Some(ref server_url) = self.server_url else {
            return;
        };

        let device_id = match crate::device::get_device_id() {
            Ok(id) => id,
            Err(_) => return,
        };

        let access_token = match crate::keychain::get("access_token") {
            Ok(Some(token)) => token,
            _ => return,
        };

        let url = format!("{}/sync/v1/vaults/{}/events", server_url, vault_id);

        let app = self.app.clone();
        let tx = match self.app.try_state::<mpsc::Sender<SyncCommand>>() {
            Some(s) => (*s).clone(),
            None => return,
        };

        let device_id_clone = device_id.clone();
        let access_token_clone = access_token.clone();

        tokio::spawn(async move {
            let mut sse = SseClient::new(tx, device_id_clone.clone());
            if let Err(e) = sse
                .connect(&url, &access_token_clone, &device_id_clone)
                .await
            {
                let _ = app.emit(
                    "sync-state-changed",
                    SyncStateEvent {
                        state: SyncEngineState::Offline,
                    },
                );
                let _ = e;
            }
        });
    }

    async fn process_queue(&mut self) {
        let (Some(ref db), Some(ref vek), Some(ref vault_id), Some(ref vault_path)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return;
        };

        let client = match self.get_http_client() {
            Some(c) => c,
            None => return,
        };

        while let Some(item) = self.queue.pop() {
            match item.op {
                SyncOp::Upload { ref path } => {
                    self.emit_file_event(path, "uploading");
                    let uploader = Uploader::new(client, db, vault_id, vault_path, vek);
                    match uploader.upload_file(path).await {
                        Ok(()) => self.emit_file_event(path, "synced"),
                        Err(e) => self.emit_file_event(path, &format!("error: {}", e)),
                    }
                }
                SyncOp::Download {
                    ref path,
                    version: _,
                } => {
                    self.emit_file_event(path, "downloading");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.download_file(path).await {
                        Ok(()) => self.emit_file_event(path, "synced"),
                        Err(e) => self.emit_file_event(path, &format!("error: {}", e)),
                    }
                }
                SyncOp::Delete { ref path } => {
                    self.emit_file_event(path, "deleting");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.delete_local_file(path).await {
                        Ok(()) => self.emit_file_event(path, "deleted"),
                        Err(e) => self.emit_file_event(path, &format!("error: {}", e)),
                    }
                }
                SyncOp::Rename {
                    ref old_path,
                    ref new_path,
                } => {
                    self.emit_file_event(old_path, "renaming");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.rename_local_file(old_path, new_path).await {
                        Ok(()) => self.emit_file_event(new_path, "synced"),
                        Err(e) => self.emit_file_event(old_path, &format!("error: {}", e)),
                    }
                }
                SyncOp::ResolveConflict { ref path } => {
                    self.emit_file_event(path, "conflict");
                }
                SyncOp::InitialSync => {}
            }
        }
    }
}
