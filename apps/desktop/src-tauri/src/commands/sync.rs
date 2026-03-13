use serde::Serialize;
use tauri::State;
use tokio::sync::mpsc;

use crate::sync::state::SyncCommand;

pub type SyncCommandSender = mpsc::Sender<SyncCommand>;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatus {
    pub running: bool,
}

#[tauri::command]
pub async fn sync_start(
    sender: State<'_, SyncCommandSender>,
    vault_id: String,
    vault_path: String,
    server_url: String,
) -> Result<(), String> {
    sender
        .send(SyncCommand::Start {
            vault_id,
            vault_path,
            server_url,
        })
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_stop(sender: State<'_, SyncCommandSender>) -> Result<(), String> {
    sender
        .send(SyncCommand::Stop)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_force_sync_file(
    sender: State<'_, SyncCommandSender>,
    path: String,
) -> Result<(), String> {
    sender
        .send(SyncCommand::ForceSyncFile { path })
        .await
        .map_err(|e| e.to_string())
}
