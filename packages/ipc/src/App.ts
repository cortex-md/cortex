import type { App as IApp } from "@cortex/platform"
import { getVersion } from "@tauri-apps/api/app"

export class App implements IApp {
	async getCurrentAppVersion(): Promise<string> {
		return await getVersion()
	}
}
