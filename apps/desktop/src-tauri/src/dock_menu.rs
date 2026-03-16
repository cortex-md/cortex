use crate::commands::registry::read_vault_registry;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::{AppHandle, Manager};

#[cfg(target_os = "macos")]
pub fn setup_dock_menu(_app: &AppHandle) {
    use objc2::rc::Retained;
    use objc2::runtime::{AnyClass, AnyObject};
    use objc2::{msg_send, msg_send_id};
    use objc2_foundation::NSString;

    let entries = read_vault_registry().unwrap_or_default();

    unsafe {
        let menu_cls = match AnyClass::get("NSMenu") {
            Some(c) => c,
            None => return,
        };
        let menu: Retained<AnyObject> = msg_send_id![menu_cls, new];
        let _: () = msg_send![&menu, setAutoenablesItems: false];

        let item_cls = match AnyClass::get("NSMenuItem") {
            Some(c) => c,
            None => return,
        };

        for entry in &entries {
            let title = NSString::from_str(&entry.name);
            let item: Retained<AnyObject> = msg_send_id![item_cls, new];
            let _: () = msg_send![&item, setTitle: &*title];
            let _: () = msg_send![&item, setEnabled: true];
            let _: () = msg_send![&menu, addItem: &*item];
        }

        let app_cls = match AnyClass::get("NSApplication") {
            Some(c) => c,
            None => return,
        };
        let ns_app: Retained<AnyObject> = msg_send_id![app_cls, sharedApplication];
        let _: () = msg_send![&ns_app, setDockMenu: &*menu];
    }
}

#[cfg(target_os = "macos")]
pub fn refresh_dock_menu(app: &AppHandle) {
    setup_dock_menu(app);
}

pub fn setup_tray(app: &mut tauri::App) -> Result<(), String> {
    use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or("No default icon found")?;

    let menu = build_tray_menu(app.handle())?;

    TrayIconBuilder::new()
        .tooltip("Cortex")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .on_menu_event(|app, event| {
            let id = event.id().0.as_str();
            if let Some(path) = id.strip_prefix("dock-vault:") {
                let _ = open_vault_window(app, path);
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn build_tray_menu(app: &AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, String> {
    let entries = read_vault_registry().unwrap_or_default();
    let mut builder = MenuBuilder::new(app);

    if entries.is_empty() {
        let item = MenuItemBuilder::with_id("no-vaults", "No Recent Vaults")
            .enabled(false)
            .build(app)
            .map_err(|e| e.to_string())?;
        builder = builder.item(&item);
    } else {
        for entry in &entries {
            let item_id = format!("dock-vault:{}", entry.path);
            let item = MenuItemBuilder::with_id(item_id, &entry.name)
                .build(app)
                .map_err(|e| e.to_string())?;
            builder = builder.item(&item);
        }
    }

    builder.build().map_err(|e| e.to_string())
}

pub fn open_vault_window(app: &AppHandle, vault_path: &str) -> Result<(), String> {
    let short_id = &uuid::Uuid::new_v4().to_string()[..8];
    let label = format!("vault-{}", short_id);
    let encoded_path = urlencoding_simple(vault_path);
    let url = format!("index.html?vault={}", encoded_path);

    let mut builder =
        tauri::WebviewWindowBuilder::new(app, &label, tauri::WebviewUrl::App(url.into()))
            .title("Cortex")
            .inner_size(1200.0, 800.0)
            .min_inner_size(800.0, 600.0);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true);
    }

    let window = builder.build().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
    }

    Ok(())
}

fn urlencoding_simple(s: &str) -> String {
    s.replace('%', "%25")
        .replace(' ', "%20")
        .replace('#', "%23")
        .replace('&', "%26")
        .replace('?', "%3F")
        .replace('=', "%3D")
}
