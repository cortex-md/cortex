import { commands, events } from "@cortex/ipc"
import type { Platform } from "../../index"
import type { App } from "../../interfaces/App"
import type { Dialog } from "../../interfaces/Dialog"
import type { FileSystem, WatchEvent } from "../../interfaces/FileSystem"
import type { Storage } from "../../interfaces/Storage"
import type { Vault } from "../../interfaces/Vault"

const fs: FileSystem = {
	readFile: (path) => commands.readFile(path),
	writeFile: (path, content) => commands.writeFile(path, content),
	deleteFile: (path) => commands.deleteFile(path),
	renameFile: (oldPath, newPath) => commands.renameFile(oldPath, newPath),
	createDir: (path) => commands.createDir(path),
	listDir: (path) =>
		commands.listDir(path).then((entries) =>
			entries.map((e) => ({
				path: e.path,
				name: e.name,
				isDir: e.is_dir,
				size: e.size,
				mtime: e.mtime,
			})),
		),
	hashFile: (path) => commands.hashFile(path),
	startWatching: async (path, callback) => {
		await commands.startWatching(path)
		const unlisten = await events.onVaultFileChanged((event) => {
			callback(event as WatchEvent)
		})
		return async () => {
			unlisten()
			await commands.stopWatching()
		}
	},
}

const vault: Vault = {
	openVault: async (path) => {
		const m = await commands.openVault(path)
		return { uuid: m.uuid, path: m.path, name: m.name, fileCount: m.file_count }
	},
	scanVault: async (path) => {
		const files = await commands.scanVault(path)
		return files.map((f) => ({
			path: f.path,
			name: f.name,
			isDir: f.is_dir,
			size: f.size,
			mtime: f.mtime,
		}))
	},
	getVaultMetadata: async (path) => {
		const m = await commands.getVaultMetadata(path)
		return { uuid: m.uuid, path: m.path, name: m.name, fileCount: m.file_count }
	},
	readVaultRegistry: () => commands.readVaultRegistry(),
	updateVaultRegistry: (uuid, path, name) => commands.updateVaultRegistry(uuid, path, name),
}

const dialog: Dialog = {
	pickFolder: (_title) => commands.pickFolder(),
	showConfirm: async (_title, _message) => true,
	showAlert: async (_title, _message) => {},
}

const storage: Storage = {
	getAppDataDir: async () => {
		const home = (globalThis as { process?: { env?: Record<string, string> } }).process?.env?.HOME
		return `${home ?? "~"}/.cortex`
	},
	getVaultConfigDir: async (vaultPath) => `${vaultPath}/.cortex`,
}

export const app: App = {
	getCurrentAppVersion: async () => await commands.currentAppVersion(),
}

export const tauriPlatform: Platform = { fs, vault, dialog, storage, app }
