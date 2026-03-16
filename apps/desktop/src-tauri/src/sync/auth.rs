use serde::{Deserialize, Serialize};

use crate::device;
use crate::sync::http::{self, parse_response, SyncHttpClient};

#[derive(Serialize)]
struct LoginRequest {
    email: String,
    password: String,
    device_id: String,
    device_name: String,
    device_type: String,
}

#[derive(Deserialize)]
pub struct LoginResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub user_id: String,
    pub email: String,
}

#[derive(Serialize)]
struct RegisterRequest {
    email: String,
    password: String,
    display_name: String,
}

#[derive(Deserialize)]
pub struct RegisterResponse {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
}

#[derive(Serialize)]
struct LogoutRequest {
    all_devices: bool,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AuthStatus {
    pub authenticated: bool,
    pub user_id: Option<String>,
    pub email: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CurrentUser {
    pub user_id: String,
    pub email: String,
}

pub async fn login(
    client: &SyncHttpClient,
    email: &str,
    password: &str,
) -> Result<LoginResponse, String> {
    let device_info = device::get_device_info()?;

    let body = LoginRequest {
        email: email.to_string(),
        password: password.to_string(),
        device_id: device_info.device_id,
        device_name: device_info.device_name,
        device_type: device_info.device_type,
    };

    let response = client.post_json("/auth/v1/login", &body).await?;
    let login_resp: LoginResponse = parse_response(response).await?;

    http::store_tokens(&login_resp.access_token, &login_resp.refresh_token)?;

    crate::keychain::set("user_id", &login_resp.user_id)?;
    crate::keychain::set("user_email", &login_resp.email)?;

    Ok(login_resp)
}

pub async fn register(
    client: &SyncHttpClient,
    email: &str,
    password: &str,
    display_name: &str,
) -> Result<RegisterResponse, String> {
    let body = RegisterRequest {
        email: email.to_string(),
        password: password.to_string(),
        display_name: display_name.to_string(),
    };

    let response = client.post_json("/auth/v1/register", &body).await?;
    let register_resp: RegisterResponse = parse_response(response).await?;

    Ok(register_resp)
}

pub async fn logout(client: &SyncHttpClient, all_devices: bool) -> Result<(), String> {
    let body = LogoutRequest { all_devices };
    let response = client.post_json("/auth/v1/logout", &body).await?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        return Err(format!("Logout failed: HTTP {}: {}", status.as_u16(), body));
    }

    http::clear_tokens()?;
    crate::keychain::delete("user_id")?;
    crate::keychain::delete("user_email")?;
    crate::keychain::delete("device_id")?;

    Ok(())
}

pub fn get_auth_status() -> Result<AuthStatus, String> {
    let authenticated = http::has_tokens()?;
    if authenticated {
        let user_id = crate::keychain::get("user_id")?;
        let email = crate::keychain::get("user_email")?;
        Ok(AuthStatus {
            authenticated: true,
            user_id,
            email,
        })
    } else {
        Ok(AuthStatus {
            authenticated: false,
            user_id: None,
            email: None,
        })
    }
}

pub fn get_current_user() -> Result<Option<CurrentUser>, String> {
    let user_id = crate::keychain::get("user_id")?;
    let email = crate::keychain::get("user_email")?;
    match (user_id, email) {
        (Some(uid), Some(e)) => Ok(Some(CurrentUser {
            user_id: uid,
            email: e,
        })),
        _ => Ok(None),
    }
}
