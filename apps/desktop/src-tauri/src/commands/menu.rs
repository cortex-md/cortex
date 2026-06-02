use crate::commands::registry::read_vault_registry;
use serde::{Deserialize, Serialize};
use tauri::menu::{
    CheckMenuItemBuilder, IsMenuItem, Menu, MenuBuilder, MenuItemBuilder, MenuItemKind,
    PredefinedMenuItem, SubmenuBuilder,
};
use tauri::{AppHandle, Emitter, Runtime, Window};

const RECENTS_SUBMENU_ID: &str = "recents-submenu";
const CONTEXT_MENU_ID_PREFIX: &str = "native-context:";

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextMenuOptions {
    request_id: String,
    items: Vec<ContextMenuItem>,
    position: Option<ContextMenuPosition>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextMenuPosition {
    x: f64,
    y: f64,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextMenuItem {
    id: Option<String>,
    text: Option<String>,
    enabled: Option<bool>,
    accelerator: Option<String>,
    #[serde(rename = "type")]
    item_type: Option<String>,
    checked: Option<bool>,
    items: Option<Vec<ContextMenuItem>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ContextMenuSelectionPayload {
    request_id: String,
    item_id: String,
}

pub fn build_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, tauri::Error> {
    let recents_submenu = build_recents_submenu(app)?;

    let new_note = MenuItemBuilder::with_id("menu-new-note", "New Note")
        .accelerator("CmdOrCtrl+N")
        .build(app)?;

    let open_vault = MenuItemBuilder::with_id("menu-open-vault", "Open Vault...")
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    let close_vault = MenuItemBuilder::with_id("menu-close-vault", "Close Vault").build(app)?;

    let settings = MenuItemBuilder::with_id("menu-open-settings", "Settings...")
        .accelerator("CmdOrCtrl+,")
        .build(app)?;

    let command_palette = MenuItemBuilder::with_id("menu-command-palette", "Command Palette")
        .accelerator("CmdOrCtrl+Shift+P")
        .build(app)?;

    let search_vault = MenuItemBuilder::with_id("menu-search-vault", "Search in Vault")
        .accelerator("CmdOrCtrl+F")
        .build(app)?;

    let toggle_sidebar = MenuItemBuilder::with_id("menu-toggle-sidebar", "Toggle Sidebar")
        .accelerator("CmdOrCtrl+B")
        .build(app)?;

    let toggle_theme = MenuItemBuilder::with_id("menu-toggle-theme", "Toggle Colorscheme")
        .accelerator("CmdOrCtrl+Shift+L")
        .build(app)?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_note)
        .separator()
        .item(&open_vault)
        .item(&recents_submenu)
        .separator()
        .item(&close_vault)
        .build()?;

    let app_menu = SubmenuBuilder::new(app, "Cortex")
        .about(None)
        .separator()
        .item(&settings)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let navigate_menu = SubmenuBuilder::new(app, "Navigate")
        .item(&command_palette)
        .separator()
        .item(&search_vault)
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_sidebar)
        .item(&toggle_theme)
        .separator()
        .fullscreen()
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    let menu = Menu::with_items(
        app,
        &[
            &app_menu,
            &file_menu,
            &edit_menu,
            &navigate_menu,
            &view_menu,
            &window_menu,
        ],
    )?;

    Ok(menu)
}

fn build_recents_submenu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<tauri::menu::Submenu<R>, tauri::Error> {
    let mut builder = SubmenuBuilder::with_id(app, RECENTS_SUBMENU_ID, "Recents");

    let entries = read_vault_registry().unwrap_or_default();

    if entries.is_empty() {
        let no_recents = MenuItemBuilder::with_id("no-recents", "No Recent Vaults")
            .enabled(false)
            .build(app)?;
        builder = builder.item(&no_recents);
    } else {
        for entry in &entries {
            let item_id = format!("recent-vault:{}", entry.path);
            let item = MenuItemBuilder::with_id(item_id, &entry.name).build(app)?;
            builder = builder.item(&item);
        }
    }

    builder.build()
}

pub fn setup_menu_event_handler<R: Runtime>(app: &AppHandle<R>) {
    let handle = app.clone();
    app.on_menu_event(move |_app, event| {
        let id = event.id().0.as_str();

        if let Some(raw) = id.strip_prefix(CONTEXT_MENU_ID_PREFIX) {
            if let Some((request_id, item_id)) = raw.split_once(':') {
                let _ = handle.emit(
                    "native-context-menu-selected",
                    ContextMenuSelectionPayload {
                        request_id: request_id.to_string(),
                        item_id: item_id.to_string(),
                    },
                );
            }
            return;
        }

        if id == "menu-new-note" {
            let _ = handle.emit("menu-new-note", ());
            return;
        }

        if id == "menu-open-vault" {
            let _ = handle.emit("menu-open-vault", ());
            return;
        }

        if id == "menu-close-vault" {
            let _ = handle.emit("menu-close-vault", ());
            return;
        }

        if id == "menu-open-settings" {
            let _ = handle.emit("menu-open-settings", ());
            return;
        }

        if id == "menu-toggle-sidebar" {
            let _ = handle.emit("menu-toggle-sidebar", ());
            return;
        }

        if id == "menu-search-vault" {
            let _ = handle.emit("menu-search-vault", ());
            return;
        }

        if id == "menu-command-palette" {
            let _ = handle.emit("menu-command-palette", ());
            return;
        }

        if id == "menu-toggle-theme" {
            let _ = handle.emit("menu-toggle-theme", ());
            return;
        }

        if let Some(path) = id.strip_prefix("recent-vault:") {
            let _ = handle.emit("menu-recent-vault", path.to_string());
        }
    });
}

fn build_context_menu_id(request_id: &str, item_id: &str) -> String {
    format!("{CONTEXT_MENU_ID_PREFIX}{request_id}:{item_id}")
}

fn build_context_menu_item<R: Runtime>(
    app: &AppHandle<R>,
    request_id: &str,
    item: &ContextMenuItem,
) -> Result<MenuItemKind<R>, tauri::Error> {
    if item.item_type.as_deref() == Some("separator") {
        return Ok(PredefinedMenuItem::separator(app)?.kind());
    }

    let item_id = item.id.as_deref().unwrap_or("item");
    let text = item.text.as_deref().unwrap_or("");
    let menu_id = build_context_menu_id(request_id, item_id);
    let enabled = item.enabled.unwrap_or(true);

    if item.item_type.as_deref() == Some("checkbox") {
        let mut builder = CheckMenuItemBuilder::with_id(menu_id, text)
            .enabled(enabled)
            .checked(item.checked.unwrap_or(false));
        if let Some(accelerator) = &item.accelerator {
            builder = builder.accelerator(accelerator);
        }
        return Ok(builder.build(app)?.kind());
    }

    if item.item_type.as_deref() == Some("submenu") {
        let mut builder = SubmenuBuilder::with_id(app, menu_id, text).enabled(enabled);
        for child in item.items.as_deref().unwrap_or(&[]) {
            let child_item = build_context_menu_item(app, request_id, child)?;
            builder = builder.item(&child_item);
        }
        return Ok(builder.build()?.kind());
    }

    let mut builder = MenuItemBuilder::with_id(menu_id, text).enabled(enabled);
    if let Some(accelerator) = &item.accelerator {
        builder = builder.accelerator(accelerator);
    }
    Ok(builder.build(app)?.kind())
}

#[tauri::command]
pub fn show_context_menu(
    app: AppHandle,
    window: Window,
    options: ContextMenuOptions,
) -> Result<(), String> {
    let mut builder = MenuBuilder::new(&app);

    for item in &options.items {
        let menu_item =
            build_context_menu_item(&app, &options.request_id, item).map_err(|e| e.to_string())?;
        builder = builder.item(&menu_item);
    }

    let menu = builder.build().map_err(|e| e.to_string())?;

    if let Some(position) = options.position {
        window
            .popup_menu_at(&menu, tauri::LogicalPosition::new(position.x, position.y))
            .map_err(|e| e.to_string())?;
    } else {
        window.popup_menu(&menu).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn refresh_menu_recents(app: AppHandle) -> Result<(), String> {
    let menu = app.menu().ok_or("No menu found")?;

    let old_submenu = menu
        .get(RECENTS_SUBMENU_ID)
        .ok_or("Recents submenu not found")?;

    menu.remove(&old_submenu).map_err(|e| e.to_string())?;

    let new_submenu = build_recents_submenu(&app).map_err(|e| e.to_string())?;

    let file_menu_item = menu.get("File").ok_or("File menu not found")?;
    if let Some(file_submenu) = file_menu_item.as_submenu() {
        file_submenu
            .insert(&new_submenu, 3)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
