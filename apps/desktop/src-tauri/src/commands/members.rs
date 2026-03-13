use serde::{Deserialize, Serialize};
use tauri::State;

use crate::sync::http::{parse_response, SyncHttpClient};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultMember {
    pub vault_id: String,
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub role: String,
    pub joined_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultInvite {
    pub id: String,
    pub vault_id: String,
    pub vault_name: String,
    pub inviter_id: String,
    pub invitee_email: String,
    pub role: String,
    pub encrypted_vault_key: Option<String>,
    pub accepted: bool,
    pub expires_at: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AcceptInviteResult {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub owner_id: String,
    pub role: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Serialize)]
struct CreateInviteRequest {
    invitee_email: String,
    role: String,
    encrypted_vault_key: String,
}

#[derive(Serialize)]
struct UpdateRoleRequest {
    role: String,
}

#[derive(Serialize)]
struct AcceptInviteRequest {
    invite_id: String,
}

#[tauri::command]
pub async fn vault_members_list(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
) -> Result<Vec<VaultMember>, String> {
    let response = client
        .get(&format!("/vaults/v1/{}/members/", vault_id))
        .await?;
    parse_response(response).await
}

#[tauri::command]
pub async fn vault_member_update_role(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
    user_id: String,
    role: String,
) -> Result<(), String> {
    let body = UpdateRoleRequest { role };
    let response = client
        .patch_json(
            &format!("/vaults/v1/{}/members/{}", vault_id, user_id),
            &body,
        )
        .await?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, body));
    }
    Ok(())
}

#[tauri::command]
pub async fn vault_member_remove(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
    user_id: String,
) -> Result<(), String> {
    let response = client
        .delete(&format!("/vaults/v1/{}/members/{}", vault_id, user_id))
        .await?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, body));
    }
    Ok(())
}

#[tauri::command]
pub async fn vault_invite_create(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
    invitee_email: String,
    role: String,
    encrypted_vault_key: String,
) -> Result<VaultInvite, String> {
    let body = CreateInviteRequest {
        invitee_email,
        role,
        encrypted_vault_key,
    };
    let response = client
        .post_json(&format!("/vaults/v1/{}/invites/", vault_id), &body)
        .await?;
    parse_response(response).await
}

#[tauri::command]
pub async fn vault_invites_list(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
) -> Result<Vec<VaultInvite>, String> {
    let response = client
        .get(&format!("/vaults/v1/{}/invites/", vault_id))
        .await?;
    parse_response(response).await
}

#[tauri::command]
pub async fn vault_invite_delete(
    client: State<'_, SyncHttpClient>,
    vault_id: String,
    invite_id: String,
) -> Result<(), String> {
    let response = client
        .delete(&format!("/vaults/v1/{}/invites/{}", vault_id, invite_id))
        .await?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("HTTP {}: {}", status, body));
    }
    Ok(())
}

#[tauri::command]
pub async fn vault_my_invites(
    client: State<'_, SyncHttpClient>,
) -> Result<Vec<VaultInvite>, String> {
    let response = client.get("/vaults/v1/invites").await?;
    parse_response(response).await
}

#[tauri::command]
pub async fn vault_invite_accept(
    client: State<'_, SyncHttpClient>,
    invite_id: String,
) -> Result<AcceptInviteResult, String> {
    let body = AcceptInviteRequest { invite_id };
    let response = client
        .post_json("/vaults/v1/invites/accept", &body)
        .await?;
    parse_response(response).await
}
