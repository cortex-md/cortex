use std::time::Duration;

use serde::Deserialize;
use tokio::sync::mpsc;

use crate::sync::state::SyncCommand;

#[derive(Debug, Deserialize)]
pub struct SseFileEvent {
    pub vault_uuid: String,
    pub file_path: String,
    pub version: u64,
    pub actor_id: String,
    pub device_id: String,
    #[serde(default)]
    pub old_path: Option<String>,
}

pub struct SseClient {
    command_tx: mpsc::Sender<SyncCommand>,
    own_device_id: String,
    last_event_id: Option<String>,
}

impl SseClient {
    pub fn new(command_tx: mpsc::Sender<SyncCommand>, own_device_id: String) -> Self {
        Self {
            command_tx,
            own_device_id,
            last_event_id: None,
        }
    }

    pub async fn connect(
        &mut self,
        url: &str,
        access_token: &str,
        device_id: &str,
    ) -> Result<(), String> {
        let mut backoff = Duration::from_secs(1);
        let max_backoff = Duration::from_secs(60);
        let mut consecutive_failures = 0u32;

        loop {
            match self.stream_events(url, access_token, device_id).await {
                Ok(()) => {
                    backoff = Duration::from_secs(1);
                    consecutive_failures = 0;
                }
                Err(e) => {
                    consecutive_failures += 1;
                    if consecutive_failures >= 5 {
                        return Err(format!("SSE failed after {} attempts: {}", consecutive_failures, e));
                    }
                    tokio::time::sleep(backoff).await;
                    backoff = (backoff * 2).min(max_backoff);
                }
            }
        }
    }

    async fn stream_events(
        &mut self,
        url: &str,
        access_token: &str,
        device_id: &str,
    ) -> Result<(), String> {
        let client = reqwest::Client::new();
        let mut builder = client
            .get(url)
            .header("Authorization", format!("Bearer {}", access_token))
            .header("X-Device-ID", device_id)
            .header("Accept", "text/event-stream");

        if let Some(ref last_id) = self.last_event_id {
            builder = builder.header("Last-Event-ID", last_id);
        }

        let response = builder.send().await.map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("SSE connection failed: {}", response.status()));
        }

        let mut buffer = String::new();
        let mut current_event_type = String::new();
        let mut current_data = String::new();
        let mut current_id = String::new();

        let mut stream = response;
        while let Ok(chunk) = stream.chunk().await {
            let chunk = match chunk {
                Some(c) => c,
                None => break,
            };

            buffer.push_str(&String::from_utf8_lossy(&chunk));

            while let Some(line_end) = buffer.find('\n') {
                let line = buffer[..line_end].trim_end_matches('\r').to_string();
                buffer = buffer[line_end + 1..].to_string();

                if line.is_empty() {
                    if !current_data.is_empty() {
                        self.handle_event(&current_event_type, &current_data, &current_id)
                            .await;
                        if !current_id.is_empty() {
                            self.last_event_id = Some(current_id.clone());
                        }
                    }
                    current_event_type.clear();
                    current_data.clear();
                    current_id.clear();
                } else if let Some(value) = line.strip_prefix("event:") {
                    current_event_type = value.trim().to_string();
                } else if let Some(value) = line.strip_prefix("data:") {
                    current_data = value.trim().to_string();
                } else if let Some(value) = line.strip_prefix("id:") {
                    current_id = value.trim().to_string();
                }
            }
        }

        Ok(())
    }

    async fn handle_event(&self, event_type: &str, data: &str, _id: &str) {
        match event_type {
            "file_created" | "file_updated" => {
                if let Ok(event) = serde_json::from_str::<SseFileEvent>(data) {
                    if event.device_id == self.own_device_id {
                        return;
                    }
                    let _ = self
                        .command_tx
                        .send(SyncCommand::RemoteFileChanged {
                            path: event.file_path,
                            version: event.version,
                        })
                        .await;
                }
            }
            "file_deleted" => {
                if let Ok(event) = serde_json::from_str::<SseFileEvent>(data) {
                    if event.device_id == self.own_device_id {
                        return;
                    }
                    let _ = self
                        .command_tx
                        .send(SyncCommand::RemoteFileDeleted {
                            path: event.file_path,
                        })
                        .await;
                }
            }
            "file_renamed" => {
                if let Ok(event) = serde_json::from_str::<SseFileEvent>(data) {
                    if event.device_id == self.own_device_id {
                        return;
                    }
                    if let Some(old_path) = event.old_path {
                        let _ = self
                            .command_tx
                            .send(SyncCommand::RemoteFileRenamed {
                                old_path,
                                new_path: event.file_path,
                            })
                            .await;
                    }
                }
            }
            "ping" => {}
            _ => {}
        }
    }
}
