use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncEngineState {
    Idle,
    #[allow(dead_code)]
    Authenticating,
    Connecting,
    #[allow(dead_code)]
    Syncing,
    Live,
    Offline,
    Recovering,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    KeepLocal,
    KeepRemote,
    Merged { content: String },
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq)]
pub enum SyncErrorKind {
    Transient,
    Permanent,
    Auth,
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct SyncError {
    pub kind: SyncErrorKind,
    pub message: String,
}

#[allow(dead_code)]
impl SyncError {
    pub fn transient(msg: impl Into<String>) -> Self {
        Self {
            kind: SyncErrorKind::Transient,
            message: msg.into(),
        }
    }

    pub fn permanent(msg: impl Into<String>) -> Self {
        Self {
            kind: SyncErrorKind::Permanent,
            message: msg.into(),
        }
    }

    pub fn auth(msg: impl Into<String>) -> Self {
        Self {
            kind: SyncErrorKind::Auth,
            message: msg.into(),
        }
    }

    pub fn from_status(status: u16, body: String) -> Self {
        match status {
            401 | 403 => Self::auth(format!("HTTP {}: {}", status, body)),
            404 | 422 => Self::permanent(format!("HTTP {}: {}", status, body)),
            409 => Self::permanent(format!("Conflict: HTTP {}: {}", status, body)),
            429 | 500 | 502 | 503 | 504 => Self::transient(format!("HTTP {}: {}", status, body)),
            _ if status >= 400 && status < 500 => {
                Self::permanent(format!("HTTP {}: {}", status, body))
            }
            _ => Self::transient(format!("HTTP {}: {}", status, body)),
        }
    }

    pub fn is_retriable(&self) -> bool {
        self.kind == SyncErrorKind::Transient
    }
}

impl std::fmt::Display for SyncError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message)
    }
}

impl From<String> for SyncError {
    fn from(msg: String) -> Self {
        Self::transient(msg)
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ConnectionMode {
    Sse,
    Polling,
    Disconnected,
}

#[derive(Debug, Clone)]
pub enum SyncCommand {
    Start {
        vault_id: String,
        vault_path: String,
        server_url: String,
    },
    Stop,
    LocalFileChanged {
        path: String,
    },
    LocalFileDeleted {
        path: String,
    },
    ForceSyncFile {
        path: String,
    },
    RemoteFileChanged {
        path: String,
        version: u64,
    },
    RemoteFileDeleted {
        path: String,
    },
    RemoteFileRenamed {
        old_path: String,
        new_path: String,
    },
    ResolveConflict {
        path: String,
        resolution: ConflictResolution,
    },
    SseConnected,
    SseDisconnected {
        last_event_id: Option<String>,
    },
    #[allow(dead_code)]
    Reconcile,
    #[allow(dead_code)]
    PollTick,
    UpdateSyncPreferences {
        sync_settings: bool,
        sync_hotkeys: bool,
        sync_workspace: bool,
        sync_plugin_metadata: bool,
        sync_theme_metadata: bool,
        excluded_paths: Vec<String>,
    },
}
