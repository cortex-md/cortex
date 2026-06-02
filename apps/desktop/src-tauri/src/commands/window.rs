use serde::{Deserialize, Serialize};
use tauri::window::{Effect, EffectState, EffectsBuilder};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenSettingsWindowOptions {
    section: Option<String>,
    marketplace_tab: Option<String>,
    vault_path: Option<String>,
    vault_name: Option<String>,
}

fn encode_query_value(value: &str) -> String {
    let mut encoded = String::new();
    for byte in value.bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                encoded.push(byte as char);
            }
            _ => encoded.push_str(&format!("%{byte:02X}")),
        }
    }
    encoded
}

fn push_query_pair(params: &mut Vec<String>, key: &str, value: &Option<String>) {
    if let Some(value) = value {
        params.push(format!("{key}={}", encode_query_value(value)));
    }
}

fn build_settings_url(options: &OpenSettingsWindowOptions) -> String {
    let mut params = vec!["window=settings".to_string()];
    push_query_pair(&mut params, "section", &options.section);
    push_query_pair(&mut params, "marketplaceTab", &options.marketplace_tab);
    push_query_pair(&mut params, "vaultPath", &options.vault_path);
    push_query_pair(&mut params, "vaultName", &options.vault_name);
    format!("index.html?{}", params.join("&"))
}

#[tauri::command]
pub async fn open_settings_window(
    app: AppHandle,
    options: OpenSettingsWindowOptions,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("settings") {
        window
            .emit("settings-route", options)
            .map_err(|e| e.to_string())?;
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return Ok(());
    }

    let url = build_settings_url(&options);
    let mut builder = WebviewWindowBuilder::new(&app, "settings", WebviewUrl::App(url.into()))
        .title("Settings")
        .inner_size(1000.0, 700.0)
        .min_inner_size(760.0, 520.0)
        .center()
        .decorations(true)
        .shadow(true)
        .resizable(true)
        .focused(true)
        .visible(true);

    #[cfg(target_os = "macos")]
    {
        builder = builder
            .transparent(true)
            .title_bar_style(tauri::TitleBarStyle::Overlay)
            .hidden_title(true)
            .effects(
                EffectsBuilder::new()
                    .effect(Effect::WindowBackground)
                    .state(EffectState::Active)
                    .radius(10.0)
                    .build(),
            );
    }

    #[cfg(target_os = "windows")]
    {
        builder = builder
            .transparent(true)
            .effects(EffectsBuilder::new().effect(Effect::Mica).build())
            .scroll_bar_style(tauri::webview::ScrollBarStyle::FluentOverlay);
    }

    builder.build().map_err(|e| e.to_string())?;
    Ok(())
}
