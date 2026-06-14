use serde::Serialize;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use crate::atomic_fs::atomic_write_string;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileMetadata {
    pub created_at: u64,
    pub modified_at: u64,
}

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn write_file(path: String, content: String) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn atomic_write_file(path: String, content: String) -> Result<(), String> {
    atomic_write_string(Path::new(&path), &content)
}

#[tauri::command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(parent) = Path::new(&path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn rename_file(old_path: String, new_path: String) -> Result<(), String> {
    rename_path(Path::new(&old_path), Path::new(&new_path))
}

fn rename_path(old_path: &Path, new_path: &Path) -> Result<(), String> {
    if old_path == new_path {
        return Ok(());
    }
    if let Some(parent) = new_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let case_only_rename = old_path.parent() == new_path.parent()
        && old_path.file_name().is_some()
        && old_path
            .file_name()
            .and_then(|name| name.to_str())
            .zip(new_path.file_name().and_then(|name| name.to_str()))
            .is_some_and(|(old_name, new_name)| {
                old_name != new_name && old_name.eq_ignore_ascii_case(new_name)
            });

    if new_path.exists() && !case_only_rename {
        return Err("Destination already exists".to_string());
    }

    if !case_only_rename {
        return fs::rename(old_path, new_path).map_err(|e| e.to_string());
    }

    let parent = old_path
        .parent()
        .ok_or_else(|| "Source path has no parent directory".to_string())?;
    let temporary_path = unique_rename_path(parent);
    fs::rename(old_path, &temporary_path).map_err(|e| e.to_string())?;
    if new_path.exists() {
        let _ = fs::rename(&temporary_path, old_path);
        return Err("Destination already exists".to_string());
    }
    match fs::rename(&temporary_path, new_path) {
        Ok(()) => Ok(()),
        Err(error) => {
            let _ = fs::rename(&temporary_path, old_path);
            Err(error.to_string())
        }
    }
}

fn unique_rename_path(parent: &Path) -> PathBuf {
    parent.join(format!(".cortex-rename-{}", Uuid::new_v4()))
}

#[tauri::command]
pub fn create_dir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn hash_file(path: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| e.to_string())?;
    let hash = blake3::hash(&data);
    Ok(hash.to_hex().to_string())
}

#[tauri::command]
pub fn get_file_metadata(path: String) -> Result<FileMetadata, String> {
    let metadata = fs::metadata(path).map_err(|e| e.to_string())?;
    let modified = metadata
        .modified()
        .unwrap_or_else(|_| std::time::SystemTime::now());
    let created = metadata.created().unwrap_or(modified);
    let to_millis = |time: std::time::SystemTime| {
        time.duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as u64
    };
    Ok(FileMetadata {
        created_at: to_millis(created),
        modified_at: to_millis(modified),
    })
}

#[tauri::command]
pub async fn download_file(url: String, dest_path: String) -> Result<(), String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    if let Some(parent) = Path::new(&dest_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&dest_path, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_text(url: String) -> Result<String, String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }
    response.text().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn download_and_extract(url: String, dest_dir: String) -> Result<(), String> {
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let cursor = io::Cursor::new(bytes);
    let mut archive = zip::ZipArchive::new(cursor).map_err(|e| e.to_string())?;
    let dest = Path::new(&dest_dir);
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let raw_name = entry.name().to_string();
        let stripped = raw_name.splitn(2, '/').nth(1).unwrap_or(&raw_name);
        if stripped.is_empty() {
            continue;
        }
        let out_path = dest.join(stripped);
        if entry.is_dir() {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut out_file = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            io::copy(&mut entry, &mut out_file).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn list_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let mut entries = Vec::new();
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;
    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = fs::metadata(entry.path()).map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        let mtime = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_secs())
            .unwrap_or(0);
        entries.push(FileEntry {
            path: entry.path().to_string_lossy().to_string(),
            name,
            is_dir: metadata.is_dir(),
            size: metadata.len(),
            mtime,
        });
    }
    entries.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });
    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_directory() -> PathBuf {
        let path = std::env::temp_dir().join(format!("cortex-fs-test-{}", Uuid::new_v4()));
        fs::create_dir_all(&path).unwrap();
        path
    }

    #[test]
    fn rename_path_rejects_existing_destination() {
        let directory = test_directory();
        let source = directory.join("source.md");
        let destination = directory.join("destination.md");
        fs::write(&source, "source").unwrap();
        fs::write(&destination, "destination").unwrap();

        let result = rename_path(&source, &destination);

        assert_eq!(result.unwrap_err(), "Destination already exists");
        assert_eq!(fs::read_to_string(&source).unwrap(), "source");
        assert_eq!(fs::read_to_string(&destination).unwrap(), "destination");
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn rename_path_supports_case_only_changes() {
        let directory = test_directory();
        let source = directory.join("Note.md");
        let destination = directory.join("note.md");
        fs::write(&source, "content").unwrap();

        rename_path(&source, &destination).unwrap();

        assert_eq!(fs::read_to_string(&destination).unwrap(), "content");
        let names = fs::read_dir(&directory)
            .unwrap()
            .map(|entry| entry.unwrap().file_name().to_string_lossy().to_string())
            .collect::<Vec<_>>();
        assert_eq!(names, vec!["note.md"]);
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn atomic_write_path_replaces_existing_content() {
        let directory = test_directory();
        let path = directory.join("schema.json");
        fs::write(&path, "old").unwrap();

        atomic_write_string(&path, "new").unwrap();

        assert_eq!(fs::read_to_string(&path).unwrap(), "new");
        fs::remove_dir_all(directory).unwrap();
    }

    #[test]
    fn file_metadata_reports_stable_creation_and_modification_times() {
        let directory = test_directory();
        let path = directory.join("note.md");
        fs::write(&path, "content").unwrap();

        let metadata = get_file_metadata(path.to_string_lossy().to_string()).unwrap();

        assert!(metadata.created_at > 0);
        assert!(metadata.modified_at >= metadata.created_at);
        fs::remove_dir_all(directory).unwrap();
    }
}
