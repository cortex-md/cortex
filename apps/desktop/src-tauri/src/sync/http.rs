use reqwest::{Client, RequestBuilder, Response};
use serde::de::DeserializeOwned;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex as AsyncMutex;

use crate::device;
use crate::keychain;

const ACCESS_TOKEN_KEY: &str = "access_token";
const REFRESH_TOKEN_KEY: &str = "refresh_token";
const SERVER_URL_KEY: &str = "server_url";

pub struct SyncHttpClient {
    client: Client,
    server_url: Mutex<String>,
    app: AppHandle,
    refresh_lock: AsyncMutex<()>,
}

impl SyncHttpClient {
    pub fn new(app: AppHandle) -> Self {
        Self {
            client: Client::new(),
            server_url: Mutex::new(String::new()),
            app,
            refresh_lock: AsyncMutex::new(()),
        }
    }

    pub fn set_server_url(&self, url: &str) {
        let mut server_url = self.server_url.lock().unwrap();
        *server_url = url.trim_end_matches('/').to_string();
        let _ = keychain::set(SERVER_URL_KEY, url);
    }

    pub fn get_server_url(&self) -> String {
        self.server_url.lock().unwrap().clone()
    }

    pub fn load_server_url(&self) {
        if let Ok(Some(url)) = keychain::get(SERVER_URL_KEY) {
            let mut server_url = self.server_url.lock().unwrap();
            *server_url = url;
        }
    }

    async fn inject_auth_headers(&self, builder: RequestBuilder) -> Result<RequestBuilder, String> {
        let access_token = keychain::get(ACCESS_TOKEN_KEY)?;
        let device_id = device::get_device_id()?;

        let builder = builder.header("X-Device-ID", &device_id);

        if let Some(token) = access_token {
            if should_refresh(&token) {
                if let Err(_) = self.refresh_tokens_internal().await {
                }
                if let Ok(Some(new_token)) = keychain::get(ACCESS_TOKEN_KEY) {
                    return Ok(builder.header("Authorization", format!("Bearer {}", new_token)));
                }
            }
            Ok(builder.header("Authorization", format!("Bearer {}", token)))
        } else {
            Ok(builder)
        }
    }

    pub async fn get(&self, path: &str) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let builder = self.client.get(&url);
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let builder = self.client.get(&url);
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    pub async fn post_json<T: serde::Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let builder = self.client.post(&url).json(body);
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let builder = self.client.post(&url).json(body);
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    pub async fn post_bytes(
        &self,
        path: &str,
        body: Vec<u8>,
        headers: Vec<(String, String)>,
    ) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let mut builder = self.client.post(&url).body(body.clone());
        for (key, value) in &headers {
            builder = builder.header(key.as_str(), value.as_str());
        }
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let mut builder = self.client.post(&url).body(body);
                for (key, value) in &headers {
                    builder = builder.header(key.as_str(), value.as_str());
                }
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    pub async fn delete(&self, path: &str) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let builder = self.client.delete(&url);
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let builder = self.client.delete(&url);
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    pub async fn patch_json<T: serde::Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let builder = self.client.patch(&url).json(body);
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let builder = self.client.patch(&url).json(body);
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    pub async fn put_json<T: serde::Serialize>(
        &self,
        path: &str,
        body: &T,
    ) -> Result<Response, String> {
        let url = format!("{}{}", self.get_server_url(), path);
        let builder = self.client.put(&url).json(body);
        let builder = self.inject_auth_headers(builder).await?;
        let response = builder.send().await.map_err(|e| e.to_string())?;

        if response.status().as_u16() == 401 {
            if self.refresh_tokens_internal().await.is_ok() {
                let builder = self.client.put(&url).json(body);
                let builder = self.inject_auth_headers(builder).await?;
                return builder.send().await.map_err(|e| e.to_string());
            }
        }

        Ok(response)
    }

    async fn refresh_tokens_internal(&self) -> Result<(), String> {
        let _guard = self.refresh_lock.lock().await;

        let refresh_token = keychain::get(REFRESH_TOKEN_KEY)?
            .ok_or_else(|| "No refresh token".to_string())?;

        let url = format!("{}/auth/v1/token/refresh", self.get_server_url());

        let response = self
            .client
            .post(&url)
            .json(&serde_json::json!({ "refresh_token": refresh_token }))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        let status = response.status();

        if status.as_u16() == 401 || status.as_u16() == 403 {
            clear_tokens_and_user_info()?;
            let _ = self.app.emit("auth-session-expired", ());
            return Err("Session expired: refresh token revoked or invalid".to_string());
        }

        if !status.is_success() {
            return Err(format!("Token refresh failed with HTTP {}", status.as_u16()));
        }

        let body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

        if let Some(access) = body["access_token"].as_str() {
            keychain::set(ACCESS_TOKEN_KEY, access)?;
        }
        if let Some(refresh) = body["refresh_token"].as_str() {
            keychain::set(REFRESH_TOKEN_KEY, refresh)?;
        }

        Ok(())
    }
}

pub async fn parse_response<T: DeserializeOwned>(response: Response) -> Result<T, String> {
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status.as_u16(), body));
    }
    response.json::<T>().await.map_err(|e| e.to_string())
}

pub fn store_tokens(access_token: &str, refresh_token: &str) -> Result<(), String> {
    keychain::set(ACCESS_TOKEN_KEY, access_token)?;
    keychain::set(REFRESH_TOKEN_KEY, refresh_token)?;
    Ok(())
}

pub fn clear_tokens() -> Result<(), String> {
    keychain::delete(ACCESS_TOKEN_KEY)?;
    keychain::delete(REFRESH_TOKEN_KEY)?;
    Ok(())
}

fn clear_tokens_and_user_info() -> Result<(), String> {
    keychain::delete(ACCESS_TOKEN_KEY)?;
    keychain::delete(REFRESH_TOKEN_KEY)?;
    let _ = keychain::delete("user_id");
    let _ = keychain::delete("user_email");
    Ok(())
}

pub fn has_tokens() -> Result<bool, String> {
    let has_access = keychain::get(ACCESS_TOKEN_KEY)?.is_some();
    let has_refresh = keychain::get(REFRESH_TOKEN_KEY)?.is_some();
    Ok(has_access && has_refresh)
}

fn should_refresh(token: &str) -> bool {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return false;
    }
    let payload = match base64::Engine::decode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        parts[1],
    ) {
        Ok(p) => p,
        Err(_) => return false,
    };
    let json: serde_json::Value = match serde_json::from_slice(&payload) {
        Ok(j) => j,
        Err(_) => return false,
    };
    let exp = match json["exp"].as_i64() {
        Some(e) => e,
        None => return false,
    };
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    exp - now < 60
}
