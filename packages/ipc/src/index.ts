import { getVersion } from "@tauri-apps/api/app"
import { invoke } from "@tauri-apps/api/core"

import { listen, type UnlistenFn } from "@tauri-apps/api/event"

export interface FileEntry {
	path: string
	name: string
	is_dir: boolean
	size: number
	mtime: number
}

export interface VaultMetadata {
	uuid: string
	path: string
	name: string
	file_count: number
}

export interface VaultRegistryEntry {
	uuid: string
	path: string
	name: string
	lastOpened: number
	icon: string | null
	color: string | null
}

export interface VaultFileChanged {
	path: string
	kind: "created" | "modified" | "deleted" | "renamed"
}

export const commands = {
	readFile: (path: string) => invoke<string>("read_file", { path }),
	writeFile: (path: string, content: string) => invoke<void>("write_file", { path, content }),
	deleteFile: (path: string) => invoke<void>("delete_file", { path }),
	renameFile: (oldPath: string, newPath: string) =>
		invoke<void>("rename_file", { oldPath, newPath }),
	createDir: (path: string) => invoke<void>("create_dir", { path }),
	hashFile: (path: string) => invoke<string>("hash_file", { path }),
	listDir: (path: string) => invoke<FileEntry[]>("list_dir", { path }),

	openVault: (path: string) => invoke<VaultMetadata>("open_vault", { path }),
	scanVault: (path: string) => invoke<FileEntry[]>("scan_vault", { path }),
	getVaultMetadata: (path: string) => invoke<VaultMetadata>("get_vault_metadata", { path }),

	startWatching: (path: string) => invoke<void>("start_watching", { path }),
	stopWatching: () => invoke<void>("stop_watching"),

	readVaultRegistry: () => invoke<VaultRegistryEntry[]>("read_vault_registry"),
	updateVaultRegistry: (uuid: string, path: string, name: string) =>
		invoke<void>("update_vault_registry", { uuid, path, name }),

	pickFolder: () => invoke<string | null>("pick_folder"),
	currentAppVersion: async () => await getVersion(),
}

export const events = {
	onVaultFileChanged: (callback: (event: VaultFileChanged) => void): Promise<UnlistenFn> =>
		listen<VaultFileChanged>("vault-file-changed", (e) => callback(e.payload)),
}
