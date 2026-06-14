use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::mpsc;
use tokio_util::sync::CancellationToken;

use crate::sync::conflict::ConflictResolver;
use crate::sync::crypto;
use crate::sync::db::{NoteSyncMetadata, SyncDb};
use crate::sync::downloader::{DownloadResult, Downloader};
use crate::sync::http::SyncHttpClient;
use crate::sync::ignore::{should_ignore, SyncPreferences};
use crate::sync::initial::InitialSync;
use crate::sync::queue::{SyncOp, SyncQueue};
use crate::sync::reconcile::Reconciler;
use crate::sync::sse::SseClient;
use crate::sync::state::{ConnectionMode, SyncCommand, SyncEngineState};
use crate::sync::uploader::Uploader;

const UPLOAD_DEBOUNCE: Duration = Duration::from_secs(5);
const DELETE_CORRELATION_WINDOW: Duration = Duration::from_millis(1000);
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

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct SyncLogEvent {
    level: String,
    message: String,
}

fn matches_synced_hash(db: Option<&SyncDb>, path: &str, hash: &str) -> bool {
    db.and_then(|database| database.get_sync_state(path).ok().flatten())
        .and_then(|state| state.local_hash)
        .is_some_and(|synced_hash| synced_hash == hash)
}

fn complete_creation_lookup(db: &SyncDb, path: &str) -> Result<(), String> {
    db.upsert_note_metadata(
        path,
        &NoteSyncMetadata {
            created_at: None,
            created_by: None,
            last_edited_at: None,
            last_edited_by: None,
            last_device_id: None,
            synced: true,
            creation_lookup_complete: true,
        },
    )
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
    pending_deletes: HashMap<String, (Instant, Option<String>)>,
    sse_cancel: Option<CancellationToken>,
    connection_mode: ConnectionMode,
    last_event_id: Option<String>,
    sync_preferences: SyncPreferences,
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
            pending_deletes: HashMap::new(),
            sse_cancel: None,
            connection_mode: ConnectionMode::Disconnected,
            last_event_id: None,
            sync_preferences: SyncPreferences::default(),
        }
    }

    fn set_state(&mut self, new_state: SyncEngineState) {
        if self.state != new_state {
            self.state = new_state.clone();
            if let Ok(state_str) = serde_json::to_value(&new_state) {
                self.emit_log(
                    "info",
                    &format!("Sync state: {}", state_str.as_str().unwrap_or("unknown")),
                );
            }
            let _ = self
                .app
                .emit("sync-state-changed", SyncStateEvent { state: new_state });
        }
    }

    fn emit_log(&self, level: &str, message: &str) {
        let _ = self.app.emit(
            "sync-log",
            SyncLogEvent {
                level: level.to_string(),
                message: message.to_string(),
            },
        );
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
                            let relative = self.to_relative_path(&path);
                            if !should_ignore(&relative, &self.sync_preferences) {
                                self.handle_local_file_changed(relative);
                            }
                        }
                        Some(SyncCommand::LocalFileDeleted { path }) => {
                            let relative = self.to_relative_path(&path);
                            if !should_ignore(&relative, &self.sync_preferences) {
                                self.handle_local_file_deleted(relative);
                            }
                        }
                        Some(SyncCommand::ForceSyncFile { path }) => {
                            let relative = self.to_relative_path(&path);
                            if !should_ignore(&relative, &self.sync_preferences) {
                                self.pending_uploads.remove(&relative);
                                let (op, priority) = SyncQueue::upload(relative);
                                self.queue.push(op, priority);
                            }
                        }
                        Some(SyncCommand::RemoteFileChanged {
                            path,
                            version,
                            actor_id,
                            device_id,
                            edited_at,
                            created,
                        }) => {
                            if !should_ignore(&path, &self.sync_preferences) {
                                if let Some(db) = &self.db {
                                    let _ = db.upsert_note_metadata(
                                        &path,
                                        &NoteSyncMetadata {
                                            created_at: created.then(|| edited_at.clone()).flatten(),
                                            created_by: created.then(|| actor_id.clone()),
                                            last_edited_at: edited_at,
                                            last_edited_by: Some(actor_id),
                                            last_device_id: Some(device_id),
                                            synced: true,
                                            creation_lookup_complete: created,
                                        },
                                    );
                                }
                                let (op, priority) = SyncQueue::download(path, version);
                                self.queue.push(op, priority);
                            }
                        }
                        Some(SyncCommand::RemoteFileDeleted { path }) => {
                            if !should_ignore(&path, &self.sync_preferences) {
                                self.queue.push(SyncOp::Delete { path }, 80);
                            }
                        }
                        Some(SyncCommand::RemoteFileRenamed { old_path, new_path }) => {
                            if !should_ignore(&new_path, &self.sync_preferences) {
                                self.queue.push(SyncOp::Rename { old_path, new_path }, 80);
                            }
                        }
                        Some(SyncCommand::ResolveConflict { path, resolution }) => {
                            let (_op, priority) = SyncQueue::conflict(path.clone());
                            self.queue.push(
                                SyncOp::ResolveConflict { path, resolution: Some(resolution) },
                                priority,
                            );
                        }
                        Some(SyncCommand::VaultAccessDenied { reason }) => {
                            self.handle_vault_access_denied(&reason);
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
                        Some(SyncCommand::UpdateSyncPreferences {
                            sync_settings,
                            sync_hotkeys,
                            sync_workspace,
                            sync_plugin_metadata,
                            sync_theme_metadata,
                            ignore_images,
                            excluded_paths,
                        }) => {
                            self.handle_update_sync_preferences(
                                sync_settings,
                                sync_hotkeys,
                                sync_workspace,
                                sync_plugin_metadata,
                                sync_theme_metadata,
                                ignore_images,
                                excluded_paths,
                            );
                        }
                        None => break,
                    }
                }
                _ = debounce_interval.tick() => {
                    self.flush_pending_uploads();
                    self.flush_pending_deletes();
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

    fn handle_local_file_changed(&mut self, relative: String) {
        if let Some(vault_path) = &self.vault_path {
            let full_path = std::path::Path::new(vault_path).join(&relative);
            if let Ok(content) = std::fs::read(&full_path) {
                let new_hash = blake3::hash(&content).to_hex().to_string();
                if matches_synced_hash(self.db.as_deref(), &relative, &new_hash) {
                    return;
                }

                let mut matched_old_path: Option<String> = None;
                for (del_path, (del_time, del_hash)) in &self.pending_deletes {
                    if Instant::now().duration_since(*del_time) <= DELETE_CORRELATION_WINDOW {
                        if let Some(ref h) = del_hash {
                            if h == &new_hash {
                                matched_old_path = Some(del_path.clone());
                                break;
                            }
                        }
                    }
                }

                if let Some(old_path) = matched_old_path {
                    self.pending_deletes.remove(&old_path);
                    let (op, priority) = SyncQueue::rename_remote(old_path, relative);
                    self.queue.push(op, priority);
                    return;
                }
            }
        }

        self.pending_uploads.insert(relative, Instant::now());
    }

    fn handle_local_file_deleted(&mut self, relative: String) {
        self.pending_uploads.remove(&relative);

        let last_hash = self
            .db
            .as_ref()
            .and_then(|db| db.get_sync_state(&relative).ok().flatten())
            .and_then(|state| state.local_hash);

        self.pending_deletes
            .insert(relative, (Instant::now(), last_hash));
    }

    fn flush_pending_deletes(&mut self) {
        let now = Instant::now();
        let ready: Vec<String> = self
            .pending_deletes
            .iter()
            .filter(|(_, (when, _))| now.duration_since(*when) > DELETE_CORRELATION_WINDOW)
            .map(|(path, _)| path.clone())
            .collect();

        for path in ready {
            self.pending_deletes.remove(&path);
            if should_ignore(&path, &self.sync_preferences) {
                continue;
            }
            let (op, priority) = SyncQueue::delete_remote(path);
            self.queue.push(op, priority);
        }
    }

    async fn handle_start(&mut self, vault_id: String, vault_path: String, server_url: String) {
        self.set_state(SyncEngineState::Connecting);

        if let Some(client) = self.app.try_state::<SyncHttpClient>() {
            client.set_server_url(&server_url);
        }

        match SyncDb::open(&vault_path) {
            Ok(db) => {
                let db = Arc::new(db);
                self.queue.set_db(db.clone());
                self.db = Some(db);
            }
            Err(e) => {
                self.emit_log("error", &format!("Sync database error: {}", e));
                self.emit_file_event("", &format!("db-error: {}", e));
                self.set_state(SyncEngineState::Idle);
                return;
            }
        }

        match crypto::load_vek(&vault_id) {
            Ok(Some(vek)) => self.vek = Some(vek),
            Ok(None) => {
                self.emit_log("warn", "Vault encryption key required");
                let _ = self.app.emit("sync-vek-required", ());
                self.set_state(SyncEngineState::Idle);
                return;
            }
            Err(e) => {
                self.emit_log("error", &format!("Vault encryption key error: {}", e));
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

        let initial_ok = self.run_initial_sync().await;
        if initial_ok {
            self.enqueue_incomplete_creation_metadata();
        }
        let sse_started = self.start_sse_listener();
        if initial_ok && sse_started {
            self.set_state(SyncEngineState::Live);
        } else {
            self.connection_mode = ConnectionMode::Polling;
            self.set_state(SyncEngineState::Offline);
        }
    }

    fn reset_engine(&mut self) {
        if let Some(cancel) = self.sse_cancel.take() {
            cancel.cancel();
        }
        if let Some(db) = &self.db {
            let _ = db.remove_queue_ops_by_type("lookup_creation_metadata");
        }
        self.vault_id = None;
        self.vault_path = None;
        self.server_url = None;
        self.db = None;
        self.vek = None;
        self.pending_uploads.clear();
        self.pending_deletes.clear();
        self.connection_mode = ConnectionMode::Disconnected;
        self.last_event_id = None;
        self.queue = SyncQueue::new();
    }

    fn handle_stop(&mut self) {
        self.reset_engine();
        self.set_state(SyncEngineState::Idle);
    }

    fn handle_vault_access_denied(&mut self, reason: &str) {
        let _ = self.app.emit(
            "sync-vault-access-denied",
            serde_json::json!({ "reason": reason }),
        );
        self.reset_engine();
        self.set_state(SyncEngineState::Denied);
    }

    fn handle_update_sync_preferences(
        &mut self,
        sync_settings: bool,
        sync_hotkeys: bool,
        sync_workspace: bool,
        sync_plugin_metadata: bool,
        sync_theme_metadata: bool,
        ignore_images: bool,
        excluded_paths: Vec<String>,
    ) {
        let old = self.sync_preferences.clone();
        self.sync_preferences = SyncPreferences {
            sync_settings,
            sync_hotkeys,
            sync_workspace,
            sync_plugin_metadata,
            sync_theme_metadata,
            ignore_images,
            excluded_paths,
        };
        let sync_preferences = self.sync_preferences.clone();
        self.pending_uploads
            .retain(|path, _| !should_ignore(path, &sync_preferences));
        self.pending_deletes
            .retain(|path, _| !should_ignore(path, &sync_preferences));

        if self.vault_path.is_none() {
            return;
        }

        let newly_enabled: Vec<&str> = vec![
            (!old.sync_settings && sync_settings).then_some(".cortex/app.json"),
            (!old.sync_hotkeys && sync_hotkeys).then_some(".cortex/hotkeys.json"),
            (!old.sync_workspace && sync_workspace).then_some(".cortex/workspace.json"),
            (!old.sync_plugin_metadata && sync_plugin_metadata)
                .then_some(".cortex/sync-plugins.json"),
            (!old.sync_theme_metadata && sync_theme_metadata).then_some(".cortex/sync-themes.json"),
        ]
        .into_iter()
        .flatten()
        .collect();

        for file_path in newly_enabled {
            let (op, priority) = SyncQueue::upload(file_path.to_string());
            self.queue.push(op, priority);
        }
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

        let reconciler = Reconciler::new(
            &self.app,
            client,
            db,
            vault_id,
            vault_path,
            vek,
            &self.sync_preferences,
        );
        let reconciled = match reconciler.run(self.last_event_id.as_deref()).await {
            Ok(Some(new_event_id)) => {
                self.last_event_id = Some(new_event_id.clone());
                if let Some(ref db) = self.db {
                    let _ = db.set_metadata("last_event_id", &new_event_id);
                }
                true
            }
            Ok(None) => true,
            Err(e) => {
                self.emit_log("error", &format!("Reconciliation failed: {}", e));
                self.emit_file_event("", &format!("reconcile-error: {}", e));
                false
            }
        };
        if reconciled {
            self.enqueue_incomplete_creation_metadata();
        }
    }

    fn enqueue_incomplete_creation_metadata(&mut self) {
        let Some(ref db) = self.db else {
            return;
        };
        let Ok(paths) = db.list_incomplete_creation_metadata() else {
            return;
        };
        for path in paths {
            let (operation, priority) = SyncQueue::lookup_creation_metadata(path);
            self.queue.push(operation, priority);
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

        if response.status().as_u16() == 403 {
            let body = response.text().await.unwrap_or_default();
            self.handle_vault_access_denied(&format!("HTTP 403: {}", body));
            return;
        }

        if !response.status().is_success() {
            return;
        }

        #[derive(serde::Deserialize)]
        #[serde(rename_all = "snake_case")]
        struct PollEvent {
            id: i64,
            event_type: String,
            file_path: String,
            version: Option<u64>,
            device_id: String,
            actor_id: String,
            created_at: String,
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
            if should_ignore(&event.file_path, &self.sync_preferences) {
                continue;
            }
            if event.event_type != "file_deleted" {
                if let Some(db) = &self.db {
                    let _ = db.upsert_note_metadata(
                        &event.file_path,
                        &NoteSyncMetadata {
                            created_at: (event.event_type == "file_created")
                                .then(|| event.created_at.clone()),
                            created_by: (event.event_type == "file_created")
                                .then(|| event.actor_id.clone()),
                            last_edited_at: Some(event.created_at.clone()),
                            last_edited_by: Some(event.actor_id.clone()),
                            last_device_id: Some(event.device_id.clone()),
                            synced: true,
                            creation_lookup_complete: event.event_type == "file_created",
                        },
                    );
                }
            }

            match event.event_type.as_str() {
                "file_created" | "file_updated" => {
                    let (op, priority) =
                        SyncQueue::download(event.file_path.clone(), event.version.unwrap_or(1));
                    self.queue.push(op, priority);
                }
                "file_deleted" => {
                    self.queue.push(
                        SyncOp::Delete {
                            path: event.file_path.clone(),
                        },
                        80,
                    );
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

            if should_ignore(&path, &self.sync_preferences) {
                continue;
            }

            if let Some(ref vault_path) = self.vault_path {
                let full_path = std::path::Path::new(vault_path).join(&path);
                if !full_path.exists() {
                    continue;
                }
            }

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

    fn start_sse_listener(&mut self) -> bool {
        let Some(ref vault_id) = self.vault_id else {
            return false;
        };
        let Some(ref server_url) = self.server_url else {
            return false;
        };

        let device_id = match crate::device::get_device_id() {
            Ok(id) => id,
            Err(_) => return false,
        };

        match crate::sync::http::get_access_token_for_server(server_url) {
            Ok(Some(_)) => {}
            _ => return false,
        }

        let url = format!("{}/sync/v1/vaults/{}/events", server_url, vault_id);

        let tx = match self.app.try_state::<mpsc::Sender<SyncCommand>>() {
            Some(s) => (*s).clone(),
            None => return false,
        };

        if let Some(cancel) = self.sse_cancel.take() {
            cancel.cancel();
        }

        let cancel = CancellationToken::new();
        self.sse_cancel = Some(cancel.clone());

        let saved_last_event_id = self.last_event_id.clone();
        let device_id_clone = device_id.clone();
        let server_url_clone = server_url.clone();

        tokio::spawn(async move {
            let mut sse = SseClient::new(tx, device_id_clone.clone(), saved_last_event_id);
            let _ = sse
                .connect(&url, &server_url_clone, &device_id_clone, cancel)
                .await;
        });

        true
    }

    async fn run_initial_sync(&self) -> bool {
        let (Some(ref db), Some(ref vek), Some(ref vault_id), Some(ref vault_path)) =
            (&self.db, &self.vek, &self.vault_id, &self.vault_path)
        else {
            return false;
        };

        let client_state = match self.app.try_state::<SyncHttpClient>() {
            Some(c) => c,
            None => return false,
        };
        let client = &*client_state;

        self.emit_log(
            "info",
            &format!("Initial sync starting for vault {}", vault_id),
        );
        let initial = InitialSync::new(
            &self.app,
            client,
            db,
            vault_id,
            vault_path,
            vek,
            &self.sync_preferences,
        );
        match initial.run().await {
            Ok(()) => {
                self.emit_log("info", "Initial sync completed successfully");
                true
            }
            Err(e) => {
                self.emit_log("error", &format!("Initial sync failed: {}", e));
                self.emit_file_event("", &format!("initial-sync-error: {}", e));
                false
            }
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
            let creation_lookup_path = match &item.op {
                SyncOp::LookupCreationMetadata { path } => Some(path.clone()),
                _ => None,
            };
            if self.should_ignore_queue_item(&item.op) {
                self.queue.mark_completed(&item);
                continue;
            }

            let result: Result<(), String> = match &item.op {
                SyncOp::Upload { ref path } => {
                    self.emit_file_event(path, "uploading");
                    let uploader = Uploader::new(client, db, vault_id, vault_path, vek);
                    match uploader.upload_file(path).await {
                        Ok(()) => {
                            self.emit_log("info", &format!("Pushed: {}", path));
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
                            self.emit_log("info", &format!("Pulled: {}", path));
                            self.emit_file_event(path, "synced");
                            Ok(())
                        }
                        Ok(DownloadResult::Merged) => {
                            self.emit_log("info", &format!("Merged: {}", path));
                            self.emit_file_event(path, "merged");
                            Ok(())
                        }
                        Ok(DownloadResult::Conflict { .. }) => {
                            self.emit_file_event(path, "conflict");
                            self.emit_log("warn", &format!("Conflict detected: {}", path));
                            let _ = self
                                .app
                                .emit("sync-conflict", serde_json::json!({ "path": path }));
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
                            self.emit_log("info", &format!("Deleted locally: {}", path));
                            self.emit_file_event(path, "deleted");
                            Ok(())
                        }
                        Err(e) => {
                            self.emit_file_event(path, &format!("error: {}", e));
                            Err(e)
                        }
                    }
                }
                SyncOp::DeleteRemote { ref path } => {
                    self.emit_file_event(path, "deleting-remote");
                    let uploader = Uploader::new(client, db, vault_id, vault_path, vek);
                    match uploader.delete_remote_file(path).await {
                        Ok(()) => {
                            self.emit_log("info", &format!("Deleted remote: {}", path));
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
                SyncOp::RenameRemote {
                    ref old_path,
                    ref new_path,
                } => {
                    self.emit_file_event(old_path, "renaming-remote");
                    let uploader = Uploader::new(client, db, vault_id, vault_path, vek);
                    match uploader.rename_remote_file(old_path, new_path).await {
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
                        let resolver = ConflictResolver::new(client, db, vault_id, vault_path, vek);
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
                SyncOp::LookupCreationMetadata { ref path } => {
                    let downloader = Downloader::new(client, db, vault_id, vault_path, vek);
                    match downloader.get_version_history(path).await {
                        Ok(mut versions) => {
                            versions.sort_by_key(|version| version.version);
                            let first = versions.first();
                            db.upsert_note_metadata(
                                path,
                                &NoteSyncMetadata {
                                    created_at: first
                                        .and_then(|version| version.created_at.clone()),
                                    created_by: first.and_then(|version| version.author_id.clone()),
                                    last_edited_at: None,
                                    last_edited_by: None,
                                    last_device_id: None,
                                    synced: true,
                                    creation_lookup_complete: true,
                                },
                            )
                        }
                        Err(error) if error.contains("HTTP 404") => {
                            complete_creation_lookup(db, path)
                        }
                        Err(error) => Err(error),
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
                    self.emit_log("error", &format!("Sync operation failed: {}", e));
                    let retriable = !e.contains("HTTP 4");
                    let exhausted = item.retry_count + 1 >= item.max_retries;
                    if let Some(path) = creation_lookup_path.as_deref() {
                        if !retriable || exhausted {
                            let _ = complete_creation_lookup(db, path);
                        }
                    }
                    self.queue.mark_failed(item, e, retriable);
                }
            }
            if creation_lookup_path.is_some() {
                break;
            }
        }
    }

    fn should_ignore_queue_item(&self, op: &SyncOp) -> bool {
        match op {
            SyncOp::Upload { path }
            | SyncOp::Download { path, .. }
            | SyncOp::Delete { path }
            | SyncOp::DeleteRemote { path }
            | SyncOp::ResolveConflict { path, .. }
            | SyncOp::LookupCreationMetadata { path } => {
                should_ignore(path, &self.sync_preferences)
            }
            SyncOp::Rename { new_path, .. } | SyncOp::RenameRemote { new_path, .. } => {
                should_ignore(new_path, &self.sync_preferences)
            }
            SyncOp::InitialSync | SyncOp::Reconcile => false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::db::SyncState;
    use uuid::Uuid;

    #[test]
    fn recognizes_watcher_echoes_from_synced_downloads() {
        let directory = std::env::temp_dir().join(format!("cortex-sync-engine-{}", Uuid::new_v4()));
        let db = SyncDb::open(directory.to_str().unwrap()).unwrap();
        db.upsert_sync_state(&SyncState {
            file_path: "note.md".to_string(),
            local_hash: Some("synced-hash".to_string()),
            remote_hash: Some("synced-hash".to_string()),
            ancestor_hash: Some("synced-hash".to_string()),
            local_mtime: None,
            remote_mtime: None,
            sync_status: "synced".to_string(),
            last_synced_at: None,
            server_version_id: None,
        })
        .unwrap();

        assert!(matches_synced_hash(Some(&db), "note.md", "synced-hash"));
        assert!(!matches_synced_hash(Some(&db), "note.md", "local-change"));
        drop(db);
        std::fs::remove_dir_all(directory).unwrap();
    }
}
