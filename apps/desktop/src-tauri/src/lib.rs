mod commands;
mod device;
mod dock_menu;
mod keychain;
mod sync;

use tauri::Manager;

#[cfg(any(target_os = "macos", test))]
const MACOS_TITLEBAR_HEIGHT: f64 = 40.0;
#[cfg(any(target_os = "macos", test))]
const MACOS_TRAFFIC_LIGHT_LEFT: f64 = 14.0;
#[cfg(any(target_os = "macos", test))]
const MACOS_TRAFFIC_LIGHT_GAP: f64 = 8.0;

#[cfg(any(target_os = "macos", test))]
#[derive(Debug, PartialEq)]
struct TrafficLightOrigin {
    x: f64,
    y: f64,
}

#[cfg(any(target_os = "macos", test))]
fn calculate_macos_traffic_light_origins(
    button_width: f64,
    button_height: f64,
) -> [TrafficLightOrigin; 3] {
    let y = (MACOS_TITLEBAR_HEIGHT - button_height) / 2.0;
    std::array::from_fn(|index| TrafficLightOrigin {
        x: MACOS_TRAFFIC_LIGHT_LEFT + index as f64 * (button_width + MACOS_TRAFFIC_LIGHT_GAP),
        y,
    })
}

#[cfg(target_os = "macos")]
fn position_macos_traffic_lights<R: tauri::Runtime>(window: &tauri::WebviewWindow<R>) {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use objc2_foundation::{CGPoint, CGRect};

    let Ok(ns_window) = window.ns_window() else {
        return;
    };

    unsafe {
        let ns_window = ns_window as *mut AnyObject;
        let close: *mut AnyObject = msg_send![ns_window, standardWindowButton: 0usize];
        let miniaturize: *mut AnyObject = msg_send![ns_window, standardWindowButton: 1usize];
        let zoom: *mut AnyObject = msg_send![ns_window, standardWindowButton: 2usize];

        if close.is_null() || miniaturize.is_null() || zoom.is_null() {
            return;
        }

        let close_superview: *mut AnyObject = msg_send![close, superview];
        if close_superview.is_null() {
            return;
        }

        let titlebar_container_view: *mut AnyObject = msg_send![close_superview, superview];
        if titlebar_container_view.is_null() {
            return;
        }

        let close_rect: CGRect = msg_send![close, frame];
        let window_frame: CGRect = msg_send![ns_window, frame];
        let mut titlebar_rect: CGRect = msg_send![titlebar_container_view, frame];
        titlebar_rect.size.height = MACOS_TITLEBAR_HEIGHT;
        titlebar_rect.origin.y = window_frame.size.height - titlebar_rect.size.height;
        let _: () = msg_send![titlebar_container_view, setFrame: titlebar_rect];

        let origins =
            calculate_macos_traffic_light_origins(close_rect.size.width, close_rect.size.height);
        let buttons = [close, miniaturize, zoom];

        for (index, button) in buttons.into_iter().enumerate() {
            let origin = CGPoint {
                x: origins[index].x,
                y: origins[index].y,
            };
            let _: () = msg_send![button, setFrameOrigin: origin];
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            commands::fs::read_file,
            commands::fs::write_file,
            commands::fs::write_binary_file,
            commands::fs::delete_file,
            commands::fs::rename_file,
            commands::fs::create_dir,
            commands::fs::hash_file,
            commands::fs::list_dir,
            commands::fs::download_file,
            commands::fs::download_text,
            commands::fs::download_and_extract,
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
            commands::sync::sync_list_deleted_files,
            commands::sync::sync_restore_deleted_file,
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

            #[cfg(target_os = "macos")]
            {
                let window = app.get_webview_window("main").unwrap();
                position_macos_traffic_lights(&window);
                let traffic_light_window = window.clone();
                window.on_window_event(move |event| {
                    if matches!(
                        event,
                        tauri::WindowEvent::Resized(_)
                            | tauri::WindowEvent::ScaleFactorChanged { .. }
                    ) {
                        position_macos_traffic_lights(&traffic_light_window);
                    }
                });

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

#[cfg(test)]
mod tests {
    use super::calculate_macos_traffic_light_origins;

    #[test]
    fn centers_fourteen_point_traffic_lights_in_the_titlebar() {
        let origins = calculate_macos_traffic_light_origins(14.0, 14.0);

        assert_eq!(origins[0].x, 14.0);
        assert_eq!(origins[1].x, 36.0);
        assert_eq!(origins[2].x, 58.0);
        assert_eq!(origins[0].y, 13.0);
        assert_eq!(origins[1].y, 13.0);
        assert_eq!(origins[2].y, 13.0);
    }
}
