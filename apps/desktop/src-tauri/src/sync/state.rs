use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncEngineState {
    Idle,
    Authenticating,
    Connecting,
    Syncing,
    Live,
    Offline,
    Recovering,
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
}
