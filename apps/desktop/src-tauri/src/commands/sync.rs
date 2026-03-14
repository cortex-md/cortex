use tauri::{AppHandle, Manager, State};
use tokio::sync::mpsc;

use crate::sync::conflict::{ConflictInfo, ConflictResolver};
use crate::sync::db::SyncDb;
use crate::sync::downloader::{Downloader, VersionInfo};
use crate::sync::http::SyncHttpClient;
use crate::sync::state::{ConflictResolution, SyncCommand};

pub type SyncCommandSender = mpsc::Sender<SyncCommand>;

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

#[tauri::command]
pub async fn sync_resolve_conflict(
    sender: State<'_, SyncCommandSender>,
    path: String,
    resolution: ConflictResolution,
) -> Result<(), String> {
    sender
        .send(SyncCommand::ResolveConflict { path, resolution })
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_get_conflicts(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
) -> Result<Vec<ConflictInfo>, String> {
    let client = app
        .try_state::<SyncHttpClient>()
        .ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::get_or_create_vek(&vault_id)?;

    let resolver = ConflictResolver::new(&client, &db, &vault_id, &vault_path, &vek);
    resolver.get_all_conflicts()
}

#[tauri::command]
pub async fn sync_get_version_history(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
    file_path: String,
) -> Result<Vec<VersionInfo>, String> {
    let client = app
        .try_state::<SyncHttpClient>()
        .ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::get_or_create_vek(&vault_id)?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    downloader.get_version_history(&file_path).await
}

#[tauri::command]
pub async fn sync_restore_version(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
    file_path: String,
    version: String,
) -> Result<(), String> {
    let client = app
        .try_state::<SyncHttpClient>()
        .ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::get_or_create_vek(&vault_id)?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    let content = downloader.download_version(&file_path, &version).await?;

    let full_path = std::path::Path::new(&vault_path).join(&file_path);
    if let Some(parent) = full_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&full_path, &content).map_err(|e| e.to_string())?;

    let hash = blake3::hash(&content).to_hex().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    db.upsert_sync_state(&crate::sync::db::SyncState {
        file_path: file_path.clone(),
        local_hash: Some(hash.clone()),
        remote_hash: Some(hash.clone()),
        ancestor_hash: Some(hash),
        local_mtime: Some(now),
        remote_mtime: Some(now),
        sync_status: "synced".to_string(),
        last_synced_at: Some(now),
        server_version_id: Some(version),
    })?;

    Ok(())
}

#[tauri::command]
pub async fn sync_download_version(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
    file_path: String,
    version: String,
) -> Result<String, String> {
    let client = app
        .try_state::<SyncHttpClient>()
        .ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::get_or_create_vek(&vault_id)?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    let bytes = downloader.download_version(&file_path, &version).await?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}
