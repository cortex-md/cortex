use keyring::Entry;

const SERVICE: &str = "cortex";

pub fn set(account: &str, value: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, account).map_err(|e| e.to_string())?;
    entry.set_password(value).map_err(|e| e.to_string())
}

pub fn get(account: &str) -> Result<Option<String>, String> {
    let entry = Entry::new(SERVICE, account).map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn delete(account: &str) -> Result<(), String> {
    let entry = Entry::new(SERVICE, account).map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
