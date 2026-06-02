use serde::Serialize;
use tauri::{Theme, Window};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeAppearanceSnapshot {
    platform: &'static str,
    color_scheme: &'static str,
    reduced_motion: bool,
    high_contrast: bool,
    accent_color: Option<String>,
    scrollbar_style: &'static str,
}

fn native_platform() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "macos"
    }

    #[cfg(target_os = "windows")]
    {
        "windows"
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        "linux"
    }
}

fn native_scrollbar_style() -> &'static str {
    #[cfg(target_os = "macos")]
    {
        "overlay"
    }

    #[cfg(target_os = "windows")]
    {
        "thin"
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        "classic"
    }
}

#[cfg(target_os = "macos")]
fn native_accent_color() -> Option<String> {
    use objc2::msg_send;
    use objc2::runtime::{AnyClass, AnyObject};
    use objc2_foundation::NSString;

    unsafe {
        let color_class = AnyClass::get("NSColor")?;
        let color: *mut AnyObject = msg_send![color_class, controlAccentColor];
        if color.is_null() {
            return None;
        }

        let color_space = NSString::from_str("NSCalibratedRGBColorSpace");
        let converted: *mut AnyObject = msg_send![color, colorUsingColorSpaceName: &*color_space];
        let resolved = if converted.is_null() { color } else { converted };

        let red: f64 = msg_send![resolved, redComponent];
        let green: f64 = msg_send![resolved, greenComponent];
        let blue: f64 = msg_send![resolved, blueComponent];

        Some(format!(
            "#{:02x}{:02x}{:02x}",
            (red.clamp(0.0, 1.0) * 255.0).round() as u8,
            (green.clamp(0.0, 1.0) * 255.0).round() as u8,
            (blue.clamp(0.0, 1.0) * 255.0).round() as u8
        ))
    }
}

#[cfg(target_os = "windows")]
fn native_accent_color() -> Option<String> {
    let output = std::process::Command::new("reg")
        .args([
            "query",
            r"HKCU\Software\Microsoft\Windows\DWM",
            "/v",
            "AccentColor",
        ])
        .output()
        .ok()?;

    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8(output.stdout).ok()?;
    let value = stdout
        .split_whitespace()
        .rev()
        .find_map(|part| part.strip_prefix("0x"))?;
    let abgr = u32::from_str_radix(value, 16).ok()?;
    let red = abgr & 0xff;
    let green = (abgr >> 8) & 0xff;
    let blue = (abgr >> 16) & 0xff;

    Some(format!("#{red:02x}{green:02x}{blue:02x}"))
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn native_accent_color() -> Option<String> {
    None
}

#[tauri::command]
pub fn get_native_appearance(window: Window) -> Result<NativeAppearanceSnapshot, String> {
    let color_scheme = match window.theme().map_err(|e| e.to_string())? {
        Theme::Dark => "dark",
        Theme::Light => "light",
        _ => "light",
    };

    Ok(NativeAppearanceSnapshot {
        platform: native_platform(),
        color_scheme,
        reduced_motion: false,
        high_contrast: false,
        accent_color: native_accent_color(),
        scrollbar_style: native_scrollbar_style(),
    })
}
