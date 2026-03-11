import type { Platform, Storage } from "@cortex/platform"
import { App } from "./App"
import { Dialog } from "./Dialog"
import { FileSystem } from "./FileSystem"
import { Font } from "./Font"
import { Vault } from "./Vault"

const storage: Storage = {
	getAppDataDir: async () => {
		const home = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.HOME
		return `${home ?? "~"}/.cortex`
	},
	getVaultConfigDir: async (vaultPath) => `${vaultPath}/.cortex`,
}

export const tauriPlatform: Platform = {
	fs: new FileSystem(),
	dialog: new Dialog(),
	vault: new Vault(),
	storage,
	app: new App(),
	font: new Font(),
	capabilities: ["menu", "hotkeys"],
}
