use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tokio::sync::mpsc;

use crate::sync::conflict::{ConflictInfo, ConflictResolver};
use crate::sync::crypto;
use crate::sync::db::SyncDb;
use crate::sync::downloader::{DeletedFileInfo, Downloader, VersionInfo};
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
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

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
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

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
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

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
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    let bytes = downloader.download_version(&file_path, &version).await?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn sync_list_deleted_files(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
) -> Result<Vec<DeletedFileInfo>, String> {
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    downloader.list_deleted_files().await
}

#[tauri::command]
pub async fn sync_restore_deleted_file(
    app: AppHandle,
    vault_id: String,
    vault_path: String,
    file_path: String,
) -> Result<(), String> {
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;
    let db = SyncDb::open(&vault_path)?;
    let vek = crate::sync::crypto::load_vek(&vault_id)?
        .ok_or("Vault encryption key not available. Unlock the vault first.")?;

    let downloader = Downloader::new(&client, &db, &vault_id, &vault_path, &vek);
    downloader.restore_deleted_file(&file_path).await
}

#[tauri::command]
pub async fn sync_update_preferences(
    sender: State<'_, SyncCommandSender>,
    sync_settings: bool,
    sync_hotkeys: bool,
    sync_workspace: bool,
    sync_plugin_metadata: bool,
    sync_theme_metadata: bool,
    excluded_paths: Vec<String>,
) -> Result<(), String> {
    sender
        .send(SyncCommand::UpdateSyncPreferences {
            sync_settings,
            sync_hotkeys,
            sync_workspace,
            sync_plugin_metadata,
            sync_theme_metadata,
            excluded_paths,
        })
        .await
        .map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultEncryptionStatus {
    pub has_key: bool,
}

#[tauri::command]
pub async fn sync_check_vault_encryption(
    app: AppHandle,
    vault_id: String,
) -> Result<VaultEncryptionStatus, String> {
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;

    let api_path = format!("/sync/v1/vaults/{}/encryption", vault_id);
    let response = client.get(&api_path).await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Check encryption failed: {}", body));
    }

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;
    let has_key = body["has_key"].as_bool().unwrap_or(false);
    Ok(VaultEncryptionStatus { has_key })
}

#[tauri::command]
pub async fn sync_create_vault_key(
    app: AppHandle,
    vault_id: String,
    password: String,
) -> Result<(), String> {
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;

    let vek = crypto::generate_vek();
    let salt = crypto::generate_salt();
    let derived_key = crypto::derive_key_from_password(&password, &salt)?;
    let encrypted_vek = crypto::encrypt_vek(&vek, &derived_key)?;

    let salt_b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &salt);
    let evek_b64 =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &encrypted_vek);

    let body = serde_json::json!({
        "salt": salt_b64,
        "encrypted_vek": evek_b64,
    });

    let api_path = format!("/sync/v1/vaults/{}/encryption", vault_id);
    let response = client.post_json(&api_path, &body).await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Create vault key failed: {}", body));
    }

    crypto::store_vek(&vault_id, &vek)?;
    Ok(())
}

#[tauri::command]
pub async fn sync_unlock_vault_key(
    app: AppHandle,
    vault_id: String,
    password: String,
) -> Result<(), String> {
    let client = app.try_state::<SyncHttpClient>().ok_or("No HTTP client")?;

    let api_path = format!("/sync/v1/vaults/{}/encryption", vault_id);
    let response = client.get(&api_path).await?;

    if !response.status().is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Fetch encryption data failed: {}", body));
    }

    let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    let salt_b64 = body["salt"].as_str().ok_or("No salt in encryption data")?;
    let evek_b64 = body["encrypted_vek"]
        .as_str()
        .ok_or("No encrypted_vek in encryption data")?;

    let salt = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, salt_b64)
        .map_err(|e| e.to_string())?;
    let encrypted_vek =
        base64::Engine::decode(&base64::engine::general_purpose::STANDARD, evek_b64)
            .map_err(|e| e.to_string())?;

    let derived_key = crypto::derive_key_from_password(&password, &salt)?;
    let vek = crypto::decrypt_vek(&encrypted_vek, &derived_key)
        .map_err(|_| "Wrong password".to_string())?;

    crypto::store_vek(&vault_id, &vek)?;
    Ok(())
}
