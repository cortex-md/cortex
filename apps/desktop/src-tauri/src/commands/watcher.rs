use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

use crate::sync::state::SyncCommand;

#[derive(Serialize, Clone)]
pub struct VaultFileChanged {
    pub path: String,
    pub kind: String,
}

struct WatcherState {
    watcher: Option<RecommendedWatcher>,
}

pub fn init(app: &tauri::App) {
    app.manage(Mutex::new(WatcherState { watcher: None }));
}

fn event_kind_to_string(kind: &EventKind) -> Option<&'static str> {
    match kind {
        EventKind::Create(_) => Some("created"),
        EventKind::Modify(_) => Some("modified"),
        EventKind::Remove(_) => Some("deleted"),
        _ => None,
    }
}

#[tauri::command]
pub fn start_watching(app: AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut state = state.lock().map_err(|e| e.to_string())?;

    let app_handle = app.clone();
    let sync_tx = app.try_state::<tokio::sync::mpsc::Sender<SyncCommand>>();
    let sync_sender = sync_tx.map(|s| (*s).clone());
    let vault_path = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<notify::Event, notify::Error>| {
            if let Ok(event) = res {
                if let Some(kind_str) = event_kind_to_string(&event.kind) {
                    for path in &event.paths {
                        let path_str = path.to_string_lossy().to_string();
                        if path_str.contains(".cortex") {
                            continue;
                        }
                        let _ = app_handle.emit(
                            "vault-file-changed",
                            VaultFileChanged {
                                path: path_str.clone(),
                                kind: kind_str.to_string(),
                            },
                        );
                        if let Some(ref sender) = sync_sender {
                            let _ = sender.try_send(SyncCommand::LocalFileChanged {
                                path: path_str,
                            });
                        }
                    }
                }
            }
        },
        Config::default(),
    )
    .map_err(|e| e.to_string())?;

    watcher
        .watch(Path::new(&vault_path), RecursiveMode::Recursive)
        .map_err(|e| e.to_string())?;

    state.watcher = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_watching(app: AppHandle) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();
    let mut state = state.lock().map_err(|e| e.to_string())?;
    state.watcher = None;
    Ok(())
}
