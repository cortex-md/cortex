import type { NativeWindow as INativeWindow, OpenSettingsWindowOptions } from "@cortex/platform"
import { invoke } from "@tauri-apps/api/core"
import { WebviewWindow } from "@tauri-apps/api/webviewWindow"
import { getCurrentWindow } from "@tauri-apps/api/window"

export class NativeWindow implements INativeWindow {
	async openSettings(options: OpenSettingsWindowOptions = {}): Promise<void> {
		await invoke<void>("open_settings_window", { options })
	}

	async closeCurrent(): Promise<void> {
		await getCurrentWindow().close()
	}

	async focusMain(): Promise<void> {
		const main = await WebviewWindow.getByLabel("main")
		await main?.unminimize().catch(() => {})
		await main?.show().catch(() => {})
		await main?.setFocus().catch(() => {})
	}
}
