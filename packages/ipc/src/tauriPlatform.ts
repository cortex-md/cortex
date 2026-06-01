import type { Platform, Storage } from "@cortex/platform"
import { App } from "./App"
import { Appearance } from "./Appearance"
import { Auth } from "./Auth"
import { Device } from "./Device"
import { Devices } from "./Devices"
import { Dialog } from "./Dialog"
import { FileSystem } from "./FileSystem"
import { Font } from "./Font"
import { Http } from "./Http"
import { Keychain } from "./Keychain"
import { Members } from "./Members"
import { NativeWindow } from "./NativeWindow"
import { Notifications } from "./Notifications"
import { RemoteVault } from "./RemoteVault"
import { Sync } from "./Sync"
import { Vault } from "./Vault"

const storage: Storage = {
	getAppDataDir: async () => {
		const home = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.HOME
		return `${home ?? "~"}/.cortex`
	},
	getVaultConfigDir: async (vaultPath) => `${vaultPath}/.cortex`,
}

export const tauriPlatform: Platform = {
	appearance: new Appearance(),
	window: new NativeWindow(),
	fs: new FileSystem(),
	dialog: new Dialog(),
	vault: new Vault(),
	storage,
	app: new App(),
	auth: new Auth(),
	font: new Font(),
	http: new Http(),
	keychain: new Keychain(),
	device: new Device(),
	sync: new Sync(),
	remoteVault: new RemoteVault(),
	members: new Members(),
	devices: new Devices(),
	notifications: new Notifications(),
	capabilities: ["menu", "hotkeys", "notifications", "notifications:sounds"],
}
