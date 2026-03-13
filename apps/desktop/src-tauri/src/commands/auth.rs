use serde::Serialize;
use tauri::State;

use crate::sync::auth::{self, AuthStatus, CurrentUser};
use crate::sync::http::SyncHttpClient;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResult {
    pub user_id: String,
    pub email: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegisterResult {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
}

#[tauri::command]
pub async fn auth_login(
    client: State<'_, SyncHttpClient>,
    server_url: String,
    email: String,
    password: String,
) -> Result<LoginResult, String> {
    client.set_server_url(&server_url);
    let result = auth::login(&client, &email, &password).await?;
    Ok(LoginResult {
        user_id: result.user_id,
        email: result.email,
    })
}

#[tauri::command]
pub async fn auth_register(
    client: State<'_, SyncHttpClient>,
    server_url: String,
    email: String,
    password: String,
    display_name: String,
) -> Result<RegisterResult, String> {
    client.set_server_url(&server_url);
    let result = auth::register(&client, &email, &password, &display_name).await?;
    Ok(RegisterResult {
        user_id: result.user_id,
        email: result.email,
        display_name: result.display_name,
    })
}

#[tauri::command]
pub async fn auth_logout(
    client: State<'_, SyncHttpClient>,
    all_devices: bool,
) -> Result<(), String> {
    auth::logout(&client, all_devices).await
}

#[tauri::command]
pub fn auth_get_status() -> Result<AuthStatus, String> {
    auth::get_auth_status()
}

#[tauri::command]
pub fn auth_get_current_user() -> Result<Option<CurrentUser>, String> {
    auth::get_current_user()
}
