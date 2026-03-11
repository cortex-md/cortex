mod commands;

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
            commands::dialog::pick_folder,
            commands::font::list_system_fonts,
        ])
        .setup(|app| {
            commands::watcher::init(app);

            let window = app.get_webview_window("main").unwrap();

            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
