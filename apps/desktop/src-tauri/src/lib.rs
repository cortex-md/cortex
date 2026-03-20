mod commands;
mod device;
mod dock_menu;
mod keychain;
mod sync;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::delete_file,
            commands::fs::rename_file,
            commands::fs::create_dir,
            commands::fs::hash_file,
            commands::fs::list_dir,
            commands::vault::open_vault,
            commands::vault::scan_vault,
            commands::vault::get_vault_metadata,
            commands::watcher::start_watching,
            commands::watcher::stop_watching,
            commands::registry::read_vault_registry,
            commands::registry::update_vault_registry,
            commands::registry::remove_from_vault_registry,
            commands::dialog::pick_folder,
            commands::font::list_system_fonts,
            commands::keychain::keychain_set,
            commands::keychain::keychain_get,
            commands::keychain::keychain_delete,
            commands::device::get_device_id,
            commands::device::get_device_info,
            commands::auth::auth_login,
            commands::auth::auth_register,
            commands::auth::auth_logout,
            commands::auth::auth_get_status,
            commands::auth::auth_get_current_user,
            commands::sync::sync_start,
            commands::sync::sync_stop,
            commands::sync::sync_force_sync_file,
            commands::sync::sync_resolve_conflict,
            commands::sync::sync_get_conflicts,
            commands::sync::sync_get_version_history,
            commands::sync::sync_restore_version,
            commands::sync::sync_download_version,
            commands::sync::sync_update_preferences,
            commands::sync::sync_check_vault_encryption,
            commands::sync::sync_create_vault_key,
            commands::sync::sync_unlock_vault_key,
            commands::menu::refresh_menu_recents,
            commands::remote_vault::remote_vault_create,
            commands::remote_vault::remote_vault_list,
            commands::remote_vault::remote_vault_get,
            commands::remote_vault::remote_vault_update,
            commands::remote_vault::remote_vault_delete,
            commands::remote_vault::remote_vault_link,
            commands::remote_vault::remote_vault_unlink,
            commands::remote_vault::remote_vault_get_link,
            commands::remote_vault::sync_config_read,
            commands::remote_vault::sync_config_update,
            commands::members::vault_members_list,
            commands::members::vault_member_update_role,
            commands::members::vault_member_remove,
            commands::members::vault_invite_create,
            commands::members::vault_invites_list,
            commands::members::vault_invite_delete,
            commands::members::vault_my_invites,
            commands::members::vault_invite_accept,
            commands::devices::devices_list,
            commands::devices::device_get,
            commands::devices::device_rename,
            commands::devices::device_revoke,
            commands::devices::device_update_sync_cursor,
        ])
        .setup(|app| {
            commands::watcher::init(app);

            let http_client = sync::http::SyncHttpClient::new(app.handle().clone());
            http_client.load_server_url();
            app.manage(http_client);

            let (tx, rx) = tokio::sync::mpsc::channel(256);
            app.manage(tx);

            let engine = sync::engine::SyncEngine::new(app.handle().clone());
            tauri::async_runtime::spawn(engine.run(rx));

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);

                let menu = commands::menu::build_menu(app.handle()).expect("Failed to build menu");
                app.set_menu(menu).expect("Failed to set menu");
                commands::menu::setup_menu_event_handler(app.handle());
                dock_menu::setup_dock_menu(app.handle());
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
