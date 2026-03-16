import type { App } from "./interfaces/App"
import type { Auth } from "./interfaces/Auth"
import type { Capabilities } from "./interfaces/Capabilities"
import type { Device } from "./interfaces/Device"
import type { Devices } from "./interfaces/Devices"
import type { Dialog } from "./interfaces/Dialog"
import type { FileSystem } from "./interfaces/FileSystem"
import type { Font } from "./interfaces/Font"
import type { Http } from "./interfaces/Http"
import type { Keychain } from "./interfaces/Keychain"
import type { Members } from "./interfaces/Members"
import type { RemoteVault } from "./interfaces/RemoteVault"
import type { Storage } from "./interfaces/Storage"
import type { Sync } from "./interfaces/Sync"
import type { Vault } from "./interfaces/Vault"

export type { App } from "./interfaces/App"
export type { Auth, AuthStatus, CurrentUser, LoginResult, RegisterResult } from "./interfaces/Auth"
export type { Capabilities } from "./interfaces/Capabilities"
export type { Device, DeviceInfo } from "./interfaces/Device"
export type { DeviceEntry, Devices } from "./interfaces/Devices"
export type { Dialog } from "./interfaces/Dialog"
export type { FileEntry, FileSystem, WatchEvent } from "./interfaces/FileSystem"
export type { Font, FontInfo } from "./interfaces/Font"
export type { Http } from "./interfaces/Http"
export type { Keychain } from "./interfaces/Keychain"
export type { AcceptInviteResult, Members, VaultInvite, VaultMember } from "./interfaces/Members"
export type { RemoteVault, RemoteVaultInfo, SyncConfig } from "./interfaces/RemoteVault"
export type { Storage } from "./interfaces/Storage"
export type {
	ConflictInfo,
	ConflictResolution,
	InitialSyncProgressEvent,
	Sync,
	SyncConflictEvent,
	SyncEngineState,
	SyncFileEvent,
	SyncPreferences,
	SyncStateEvent,
	VaultEncryptionStatus,
	VersionInfo,
} from "./interfaces/Sync"
export type { Vault, VaultMetadata, VaultRegistryEntry } from "./interfaces/Vault"

export interface Platform {
	fs: FileSystem
	dialog: Dialog
	storage: Storage
	vault: Vault
	app: App
	font: Font
	http: Http
	keychain: Keychain
	device: Device
	auth: Auth
	sync: Sync
	remoteVault: RemoteVault
	members: Members
	devices: Devices
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
