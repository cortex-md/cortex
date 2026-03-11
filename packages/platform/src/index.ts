import type { App } from "./interfaces/App"
import type { Capabilities } from "./interfaces/Capabilities"
import type { Dialog } from "./interfaces/Dialog"
import type { FileSystem } from "./interfaces/FileSystem"
import type { Font } from "./interfaces/Font"
import type { Http } from "./interfaces/Http"
import type { Storage } from "./interfaces/Storage"
import type { Vault } from "./interfaces/Vault"

export type { App } from "./interfaces/App"
export type { Capabilities } from "./interfaces/Capabilities"
export type { Dialog } from "./interfaces/Dialog"
export type { FileEntry, FileSystem, WatchEvent } from "./interfaces/FileSystem"
export type { Font, FontInfo } from "./interfaces/Font"
export type { Storage } from "./interfaces/Storage"
export type { Vault, VaultMetadata, VaultRegistryEntry } from "./interfaces/Vault"
export type { Http } from "./interfaces/Http"

export interface Platform {
	fs: FileSystem
	dialog: Dialog
	storage: Storage
	vault: Vault
	app: App
  font: Font
	http: Http
	capabilities: Capabilities[]
}

let _platform: Platform | null = null

export function initPlatform(platform: Platform): void {
	_platform = platform
}

export function getPlatform(): Platform {
	if (!_platform) {
		throw new Error("Platform not initialized. Call initPlatform() first.")
	}
	return _platform
}
