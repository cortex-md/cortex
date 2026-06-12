import type { App as IApp } from "@cortex/platform"
import { getVersion } from "@tauri-apps/api/app"
import { openUrl } from "@tauri-apps/plugin-opener"

export class App implements IApp {
	async getCurrentAppVersion(): Promise<string> {
		return await getVersion()
	}

	async openExternalUrl(url: string): Promise<void> {
		await openUrl(url)
	}
}
