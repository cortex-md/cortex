import type { FileEntry, VaultMetadata, VaultRegistryEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { getSettingsManager, initSettingsManager } from "@cortex/settings"
import { create } from "zustand"
import { noteCache } from "../noteCache"

export type { VaultMetadata, VaultRegistryEntry }

export interface VaultState {
	vault: VaultMetadata | null
	files: FileEntry[]
	recentVaults: VaultRegistryEntry[]
	loading: boolean
	error: string | null
	stopWatcher: (() => void) | null

	openVault: (
		path: string,
		options?: { icon?: string; color?: string; name: string },
	) => Promise<void>
	closeVault: () => Promise<void>
	refreshFiles: () => Promise<void>
	loadRecentVaults: () => Promise<void>
	createFile: (parentPath: string, name: string) => Promise<string>
	createFolder: (parentPath: string, name: string) => Promise<string>
	deleteFile: (filePath: string) => Promise<void>
	renameFile: (oldPath: string, newName: string) => Promise<string>
	duplicateFile: (filePath: string) => Promise<string>
}

export const useVaultStore = create<VaultState>((set, get) => ({
	vault: null,
	files: [],
	recentVaults: [],
	loading: false,
	error: null,
	stopWatcher: null,

	openVault: async (path, options) => {
		const platform = getPlatform()
		set({ loading: true, error: null })
		try {
			const metadata = await platform.vault.openVault(path)
			await platform.vault.updateVaultRegistry(
				metadata.uuid,
				metadata.path,
				options?.name ?? metadata.path,
				options?.icon,
				options?.color,
			)
			const files = await platform.vault.scanVault(path)

			const stopWatcher = await platform.fs.startWatching(path, async (event) => {
				get().refreshFiles()
				const hash = await platform.fs.hashFile(event.path)
				await noteCache.handleExternalChange(event.path, hash)
			})

			initSettingsManager()
			await getSettingsManager().loadFromVault(path)

			set({
				vault: metadata,
				files,
				loading: false,
				stopWatcher,
			})
		} catch (e) {
			set({ loading: false, error: String(e) })
		}
	},

	closeVault: async () => {
		const { stopWatcher } = get()
		stopWatcher?.()
		await getSettingsManager().flush()
		set({
			vault: null,
			files: [],
			stopWatcher: null,
			error: null,
		})
	},

	refreshFiles: async () => {
		const { vault } = get()
		if (!vault) return
		try {
			const files = await getPlatform().vault.scanVault(vault.path)
			set({ files })
		} catch (_e) {}
	},

	loadRecentVaults: async () => {
		try {
			const entries = await getPlatform().vault.readVaultRegistry()
			const sorted = [...entries].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
			set({ recentVaults: sorted })
		} catch (_e) {}
	},

	createFile: async (parentPath, name) => {
		const platform = getPlatform()
		const fileName = name.endsWith(".md") ? name : `${name}.md`
		const filePath = `${parentPath}/${fileName}`
		await platform.fs.writeFile(filePath, "")
		await get().refreshFiles()
		return filePath
	},

	createFolder: async (parentPath, name) => {
		const platform = getPlatform()
		const folderPath = `${parentPath}/${name}`
		await platform.fs.createDir(folderPath)
		await get().refreshFiles()
		return folderPath
	},

	deleteFile: async (filePath) => {
		const platform = getPlatform()
		await platform.fs.deleteFile(filePath)
		await get().refreshFiles()
	},

	renameFile: async (oldPath, newName) => {
		const platform = getPlatform()
		const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"))
		const newPath = `${parentPath}/${newName}`
		await platform.fs.renameFile(oldPath, newPath)
		await get().refreshFiles()
		return newPath
	},

	duplicateFile: async (filePath) => {
		const platform = getPlatform()
		const ext = filePath.lastIndexOf(".")
		const basePath = ext > 0 ? filePath.substring(0, ext) : filePath
		const extension = ext > 0 ? filePath.substring(ext) : ""
		const newPath = `${basePath} (copy)${extension}`
		const content = await platform.fs.readFile(filePath)
		await platform.fs.writeFile(newPath, content)
		await get().refreshFiles()
		return newPath
	},
}))
