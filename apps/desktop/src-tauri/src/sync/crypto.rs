use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use rand::RngCore;

use crate::keychain;

const VEK_PREFIX: &str = "vek_";

pub fn generate_vek() -> [u8; 32] {
    let mut key = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut key);
    key
}

pub fn store_vek(vault_id: &str, vek: &[u8; 32]) -> Result<(), String> {
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, vek);
    keychain::set(&format!("{}{}", VEK_PREFIX, vault_id), &encoded)
}

pub fn load_vek(vault_id: &str) -> Result<Option<[u8; 32]>, String> {
    let encoded = keychain::get(&format!("{}{}", VEK_PREFIX, vault_id))?;
    match encoded {
        Some(s) => {
            let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &s)
                .map_err(|e| e.to_string())?;
            if bytes.len() != 32 {
                return Err("Invalid VEK length".to_string());
            }
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            Ok(Some(key))
        }
        None => Ok(None),
    }
}

pub fn get_or_create_vek(vault_id: &str) -> Result<[u8; 32], String> {
    if let Some(vek) = load_vek(vault_id)? {
        return Ok(vek);
    }
    let vek = generate_vek();
    store_vek(vault_id, &vek)?;
    Ok(vek)
}

pub fn encrypt(plaintext: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(key.into());
    let mut iv = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut iv);
    let nonce = Nonce::from_slice(&iv);
    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| format!("Encryption failed: {}", e))?;

    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&iv);
    result.extend_from_slice(&ciphertext);
    Ok(result)
}

pub fn decrypt(blob: &[u8], key: &[u8; 32]) -> Result<Vec<u8>, String> {
    if blob.len() < 12 {
        return Err("Ciphertext too short".to_string());
    }
    let cipher = Aes256Gcm::new(key.into());
    let nonce = Nonce::from_slice(&blob[..12]);
    let ciphertext = &blob[12..];
    cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption failed: {}", e))
}
