pub fn should_ignore(path: &str) -> bool {
    let normalized = path.replace('\\', "/");

    if normalized.contains("/.cortex/") || normalized.ends_with("/.cortex") {
        return true;
    }

    let filename = normalized.rsplit('/').next().unwrap_or(&normalized);
    matches!(filename, ".DS_Store" | "Thumbs.db" | "desktop.ini")
}
