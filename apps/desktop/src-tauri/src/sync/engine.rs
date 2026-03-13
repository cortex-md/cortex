use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::sync::conflict::ConflictResolver;
use crate::sync::crypto;
use crate::sync::db::SyncDb;
use crate::sync::downloader::{DownloadResult, Downloader};
use crate::sync::http::SyncHttpClient;
use crate::sync::ignore::should_ignore;
use crate::sync::initial::InitialSync;
use crate::sync::queue::{SyncOp, SyncQueue};
use crate::sync::reconcile::Reconciler;
use crate::sync::sse::SseClient;
use crate::sync::state::{ConnectionMode, SyncCommand, SyncEngineState};
use crate::sync::uploader::Uploader;

const UPLOAD_DEBOUNCE: Duration = Duration::from_secs(5);
const POLL_INTERVAL: Duration = Duration::from_secs(30);
const RETRY_RELOAD_INTERVAL: Duration = Duration::from_secs(60);

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
    sse_cancel: Option<CancellationToken>,
    connection_mode: ConnectionMode,
    last_event_id: Option<String>,
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
            sse_cancel: None,
            connection_mode: ConnectionMode::Disconnected,
            last_event_id: None,
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

    pub async fn run(mut self, mut rx: mpsc::Receiver<SyncCommand>) {
        let mut debounce_interval = tokio::time::interval(Duration::from_secs(1));
        let mut poll_interval = tokio::time::interval(POLL_INTERVAL);
        let mut retry_reload_interval = tokio::time::interval(RETRY_RELOAD_INTERVAL);

        loop {
            tokio::select! {
                cmd = rx.recv() => {
                    match cmd {
                        Some(SyncCommand::Start { vault_id, vault_path, server_url }) => {
                            self.handle_start(vault_id, vault_path, server_url).await;
                        }
                        Some(SyncCommand::Stop) => {
                            self.handle_stop();
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
                        Some(SyncCommand::ResolveConflict { path, resolution }) => {
                            let (_op, priority) = SyncQueue::conflict(path.clone());
                            self.queue.push(
                                SyncOp::ResolveConflict { path, resolution: Some(resolution) },
                                priority,
                            );
                        }
                        Some(SyncCommand::SseConnected) => {
                            self.handle_sse_connected().await;
                        }
                        Some(SyncCommand::SseDisconnected { last_event_id }) => {
                            self.handle_sse_disconnected(last_event_id);
                        }
                        Some(SyncCommand::Reconcile) => {
                            self.handle_reconcile().await;
                        }
                        Some(SyncCommand::PollTick) => {
                            self.handle_poll_tick().await;
                        }
                        None => break,
                    }
                }
                _ = debounce_interval.tick() => {
                    self.flush_pending_uploads();
                }
                _ = poll_interval.tick() => {
                    if matches!(self.connection_mode, ConnectionMode::Polling) && self.vault_id.is_some() {
                        self.handle_poll_tick().await;
                    }
                }
                _ = retry_reload_interval.tick() => {
                    if self.vault_id.is_some() {
                        let _ = self.queue.reload_ready();
                    }
                }
            }

            self.process_queue().await;
        }
    }

    async fn handle_start(
        &mut self,
        vault_id: String,
        vault_path: String,
        server_url: String,
    ) {
        self.set_state(SyncEngineState::Connecting);

        match SyncDb::open(&vault_path) {
            Ok(db) => {
                let db = Arc::new(db);
                self.queue.set_db(db.clone());
                self.db = Some(db);
            }
            Err(e) => {
                self.emit_file_event("", &format!("db-error: {}", e));
                self.set_state(SyncEngineState::Idle);
                return;
            }
        }

        match crypto::get_or_create_vek(&vault_id) {
            Ok(vek) => self.vek = Some(vek),
            Err(e) => {
                self.emit_file_event("", &format!("vek-error: {}", e));
                self.set_state(SyncEngineState::Idle);
                return;
            }
        }

        if let Some(ref db) = self.db {
            self.last_event_id = db.get_metadata("last_event_id").unwrap_or(None);
        }

        if let Ok(loaded) = self.queue.load_from_db() {
            if loaded > 0 {
                self.emit_file_event("", &format!("resumed {} queued ops", loaded));
            }
        }

        self.vault_id = Some(vault_id);
        self.vault_path = Some(vault_path);
        self.server_url = Some(server_url);

        self.run_initial_sync().await;
        self.start_sse_listener();
        self.set_state(SyncEngineState::Live);
    }

    fn handle_stop(&mut self) {
        if let Some(cancel) = self.sse_cancel.take() {
            cancel.cancel();
        }
        self.vault_id = None;
        self.vault_path = None;
        self.server_url = None;
        self.db = None;
        self.vek = None;
        self.pending_uploads.clear();
        self.connection_mode = ConnectionMode::Disconnected;
        self.last_event_id = None;
        self.queue = SyncQueue::new();
        self.set_state(SyncEngineState::Idle);
    }

    async fn handle_sse_connected(&mut self) {
        self.connection_mode = ConnectionMode::Sse;

        if self.state == SyncEngineState::Offline {
            self.set_state(SyncEngineState::Recovering);
            self.handle_reconcile().await;
            self.set_state(SyncEngineState::Live);
        } else {
            self.set_state(SyncEngineState::Live);
        }
    }

    fn handle_sse_disconnected(&mut self, last_event_id: Option<String>) {
        if let Some(id) = last_event_id {
            self.last_event_id = Some(id.clone());
            if let Some(ref db) = self.db {
                let _ = db.set_metadata("last_event_id", &id);
            }
        }
        self.connection_mode = ConnectionMode::Polling;
        self.set_state(SyncEngineState::Offline);
    }

    async fn handle_reconcile(&mut self) {
        let (Some(ref db), Some(ref vek), Some(ref vault_id), Some(ref vault_path)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return;
        };

        let client_state = match self.app.try_state::<SyncHttpClient>() {
            Some(c) => c,
            None => return,
        };
        let client = &*client_state;

        let reconciler = Reconciler::new(&self.app, client, db, vault_id, vault_path, vek);
        match reconciler.run(self.last_event_id.as_deref()).await {
            Ok(Some(new_event_id)) => {
                self.last_event_id = Some(new_event_id.clone());
                if let Some(ref db) = self.db {
                    let _ = db.set_metadata("last_event_id", &new_event_id);
                }
            }
            Ok(None) => {}
            Err(e) => {
                self.emit_file_event("", &format!("reconcile-error: {}", e));
            }
        }
    }

    async fn handle_poll_tick(&mut self) {
        let (Some(_), Some(_), Some(ref vault_id), Some(_)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return;
        };

        let client_state = match self.app.try_state::<SyncHttpClient>() {
            Some(c) => c,
            None => return,
        };
        let client = &*client_state;

        let since = self.last_event_id.as_deref().unwrap_or("0");
        let api_path = format!(
            "/sync/v1/vaults/{}/changes?since={}&limit=50",
            vault_id, since
        );

        let response = match client.get(&api_path).await {
            Ok(r) => r,
            Err(_) => return,
        };

        if !response.status().is_success() {
            return;
        }

        #[derive(serde::Deserialize)]
        #[serde(rename_all = "snake_case")]
        struct PollEvent {
            id: i64,
            event_type: String,
            file_path: String,
            #[allow(dead_code)]
            version: Option<u64>,
            device_id: String,
            metadata: Option<serde_json::Value>,
        }

        let own_device_id = crate::device::get_device_id().unwrap_or_default();

        let events: Vec<PollEvent> = match response.json().await {
            Ok(e) => e,
            Err(_) => return,
        };

        for event in &events {
            if event.device_id == own_device_id {
                continue;
            }
            if should_ignore(&event.file_path) {
                continue;
            }

            match event.event_type.as_str() {
                "file_created" | "file_updated" => {
                    let (op, priority) =
                        SyncQueue::download(event.file_path.clone(), event.version.unwrap_or(1));
                    self.queue.push(op, priority);
                }
                "file_deleted" => {
                    self.queue
                        .push(SyncOp::Delete { path: event.file_path.clone() }, 80);
                }
                "file_renamed" => {
                    let old_path = event
                        .metadata
                        .as_ref()
                        .and_then(|m| m.get("old_path"))
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string();

                    if old_path.is_empty() {
                        let (op, priority) = SyncQueue::download(
                            event.file_path.clone(),
                            event.version.unwrap_or(1),
                        );
                        self.queue.push(op, priority);
                    } else {
                        self.queue.push(
                            SyncOp::Rename {
                                old_path,
                                new_path: event.file_path.clone(),
                            },
                            80,
                        );
                    }
                }
                _ => {}
            }
        }

        if let Some(last) = events.last() {
            let new_id = last.id.to_string();
            self.last_event_id = Some(new_id.clone());
            if let Some(ref db_ref) = self.db {
                let _ = db_ref.set_metadata("last_event_id", &new_id);
            }
        }
    }

    fn flush_pending_uploads(&mut self) {
        let now = Instant::now();
        let ready: Vec<String> = self
            .pending_uploads
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

    fn start_sse_listener(&mut self) {
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

        let tx = match self.app.try_state::<mpsc::Sender<SyncCommand>>() {
            Some(s) => (*s).clone(),
            None => return,
        };

        if let Some(cancel) = self.sse_cancel.take() {
            cancel.cancel();
        }

        let cancel = CancellationToken::new();
        self.sse_cancel = Some(cancel.clone());

        let saved_last_event_id = self.last_event_id.clone();
        let device_id_clone = device_id.clone();
        let access_token_clone = access_token.clone();

        tokio::spawn(async move {
            let mut sse = SseClient::new(tx, device_id_clone.clone(), saved_last_event_id);
            let _ = sse
                .connect(&url, &access_token_clone, &device_id_clone, cancel)
                .await;
        });
    }

    async fn run_initial_sync(&self) {
        let (Some(ref db), Some(ref vek), Some(ref vault_id), Some(ref vault_path)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return;
        };

        let client_state = match self.app.try_state::<SyncHttpClient>() {
            Some(c) => c,
            None => return,
        };
        let client = &*client_state;

        let initial = InitialSync::new(&self.app, client, db, vault_id, vault_path, vek);
        if let Err(e) = initial.run().await {
            self.emit_file_event("", &format!("initial-sync-error: {}", e));
        }
    }

    async fn process_queue(&mut self) {
        let (Some(ref db), Some(ref vek), Some(ref vault_id), Some(ref vault_path)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return;
        };

        let client_state = match self.app.try_state::<SyncHttpClient>() {
            Some(c) => c,
            None => return,
        };
        let client = &*client_state;

        while let Some(item) = self.queue.pop() {
            let result: Result<(), String> = match &item.op {
                SyncOp::Upload { ref path } => {
                    self.emit_file_event(path, "uploading");
                    let uploader = Uploader::new(client, db, vault_id, vault_path, vek);
                    match uploader.upload_file(path).await {
                        Ok(()) => {
                            self.emit_file_event(path, "synced");
                            Ok(())
                        }
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e));
                            Err(e)
                        }
                    }
                }
                SyncOp::Download {
                    ref path,
                    version: _,
                } => {
                    self.emit_file_event(path, "downloading");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.download_file(path).await {
                        Ok(DownloadResult::Synced) => {
                            self.emit_file_event(path, "synced");
                            Ok(())
                        }
                        Ok(DownloadResult::Merged) => {
                            self.emit_file_event(path, "merged");
                            Ok(())
                        }
                        Ok(DownloadResult::Conflict { .. }) => {
                            self.emit_file_event(path, "conflict");
                            let _ = self.app.emit(
                                "sync-conflict",
                                serde_json::json!({ "path": path }),
                            );
                            Ok(())
                        }
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e));
                            Err(e)
                        }
                    }
                }
                SyncOp::Delete { ref path } => {
                    self.emit_file_event(path, "deleting");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.delete_local_file(path).await {
                        Ok(()) => {
                            self.emit_file_event(path, "deleted");
                            Ok(())
                        }
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e));
                            Err(e)
                        }
                    }
                }
                SyncOp::Rename {
                    ref old_path,
                    ref new_path,
                } => {
                    self.emit_file_event(old_path, "renaming");
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.rename_local_file(old_path, new_path).await {
                        Ok(()) => {
                            self.emit_file_event(new_path, "synced");
                            Ok(())
                        }
                        Err(e) => {
                            self.emit_file_event(old_path, &format!("error: {}", e));
                            Err(e)
                        }
                    }
                }
                SyncOp::ResolveConflict {
                    ref path,
                    ref resolution,
                } => {
                    if let Some(ref res) = resolution {
                        self.emit_file_event(path, "resolving");
                        let resolver =
                            ConflictResolver::new(client, db, vault_id, vault_path, vek);
                        match resolver.apply_resolution(path, res).await {
                            Ok(()) => {
                                self.emit_file_event(path, "synced");
                                Ok(())
                            }
                            Err(e) => {
                                self.emit_file_event(path, &format!("error: {}", e));
                                Err(e)
                            }
                        }
                    } else {
                        Ok(())
                    }
                }
                SyncOp::InitialSync => Ok(()),
                SyncOp::Reconcile => Ok(()),
            };

            match result {
                Ok(()) => {
                    self.queue.mark_completed(&item);
                }
                Err(ref e) => {
                    let retriable = !e.contains("HTTP 4");
                    self.queue.mark_failed(item, e, retriable);
                }
            }
        }
    }
}
