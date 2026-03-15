#[derive(Debug, Clone)]
pub struct SyncPreferences {
    pub sync_settings: bool,
    pub sync_hotkeys: bool,
    pub sync_workspace: bool,
    pub sync_plugin_metadata: bool,
    pub sync_theme_metadata: bool,
    pub excluded_paths: Vec<String>,
}

impl Default for SyncPreferences {
    fn default() -> Self {
        Self {
            sync_settings: false,
            sync_hotkeys: false,
            sync_workspace: false,
            sync_plugin_metadata: false,
            sync_theme_metadata: false,
            excluded_paths: vec![],
        }
    }
}

pub fn should_ignore(path: &str, prefs: &SyncPreferences) -> bool {
    let normalized = path.replace('\\', "/");

    let filename = normalized.rsplit('/').next().unwrap_or(&normalized);
    if matches!(filename, ".DS_Store" | "Thumbs.db" | "desktop.ini") {
        return true;
    }

    let is_cortex = normalized.contains("/.cortex/")
        || normalized.ends_with("/.cortex")
        || normalized.starts_with(".cortex/")
        || normalized == ".cortex";

    if !is_cortex {
        for excluded in &prefs.excluded_paths {
            if excluded.ends_with('/') {
                if normalized.starts_with(excluded) {
                    return true;
                }
            } else if normalized == *excluded {
                return true;
            }
        }
        return false;
    }

    let cortex_file = normalized
        .rsplit("/.cortex/")
        .next()
        .or_else(|| normalized.strip_prefix(".cortex/"))
        .unwrap_or(&normalized);

    if matches!(
        cortex_file,
        "sync-preferences.json" | "sync.db" | "sync.db-wal" | "sync.db-journal" | "sync.db-shm"
    ) {
        return true;
    }

    match cortex_file {
        "app.json" => !prefs.sync_settings,
        "hotkeys.json" => !prefs.sync_hotkeys,
        "workspace.json" => !prefs.sync_workspace,
        "sync-plugins.json" => !prefs.sync_plugin_metadata,
        "sync-themes.json" => !prefs.sync_theme_metadata,
        _ => true,
    }
}
