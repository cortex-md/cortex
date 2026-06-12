import type { FileEntry, VaultMetadata, VaultRegistryEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { getSettingsManager, initSettingsManager } from "@cortex/settings"
import { create } from "zustand"
import { noteCache } from "../noteCache"
import { createDefaultFrontmatter } from "../utils/frontmatter"
import { useSyncStore } from "./syncStore"

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
	loadVaultSnapshot: (path: string) => Promise<void>
	closeVault: () => Promise<void>
	refreshFiles: () => Promise<void>
	loadRecentVaults: () => Promise<void>
	removeRecentVault: (uuid: string) => Promise<void>
	createFile: (parentPath: string, name: string) => Promise<string>
	createFolder: (parentPath: string, name: string) => Promise<string>
	deleteFile: (filePath: string) => Promise<void>
	renameFile: (oldPath: string, newName: string) => Promise<string>
	duplicateFile: (filePath: string) => Promise<string>
	openDailyNote: () => Promise<string | null>
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
				options?.name ?? metadata.name,
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
			await useSyncStore.getState().loadSyncPreferences(path)

			set({
				vault: metadata,
				files,
				loading: false,
				stopWatcher,
			})

			await get().loadRecentVaults()
		} catch (e) {
			set({ loading: false, error: String(e) })
		}
	},

	loadVaultSnapshot: async (path) => {
		const platform = getPlatform()
		set({ loading: true, error: null })
		try {
			const metadata = await platform.vault.openVault(path)
			const files = await platform.vault.scanVault(path)

			initSettingsManager()
			await getSettingsManager().loadFromVault(path)
			await useSyncStore.getState().loadSyncPreferences(path)

			set({
				vault: metadata,
				files,
				loading: false,
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
		} catch (error) {
			console.error("[Vault refresh failed]", { vaultPath: vault.path, error })
			set({ error: String(error) })
		}
	},

	loadRecentVaults: async () => {
		try {
			const platform = getPlatform()
			const entries = await platform.vault.readVaultRegistry()
			const sorted = [...entries].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
			set({ recentVaults: sorted })
			try {
				await platform.vault.refreshMenuRecents()
			} catch (error) {
				console.error("[Recent vault menu refresh failed]", { error })
			}
		} catch (error) {
			console.error("[Recent vault load failed]", { error })
			set({ error: String(error) })
		}
	},

	removeRecentVault: async (uuid) => {
		try {
			await getPlatform().vault.removeFromVaultRegistry(uuid)
			await get().loadRecentVaults()
		} catch (error) {
			console.error("[Recent vault removal failed]", { uuid, error })
			set({ error: String(error) })
		}
	},

	createFile: async (parentPath, name) => {
		const platform = getPlatform()
		const fileName = name.endsWith(".md") ? name : `${name}.md`
		const filePath = `${parentPath}/${fileName}`
		const content = createDefaultFrontmatter()
		await platform.fs.writeFile(filePath, content)
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

	openDailyNote: async () => {
		const { vault, files } = get()
		if (!vault) return null

		const platform = getPlatform()
		const today = new Date()
		const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
		const dailyDir = `${vault.path}/Daily`
		const filePath = `${dailyDir}/${dateStr}.md`

		const existingFile = files.find((f) => f.path === filePath)
		if (existingFile) return filePath

		const dailyDirExists = files.some((f) => f.isDir && f.path === dailyDir)
		if (!dailyDirExists) {
			await platform.fs.createDir(dailyDir)
		}

		const content = createDefaultFrontmatter({
			tags: ["daily"],
			extraFields: { date: dateStr },
		})
		await platform.fs.writeFile(filePath, `${content}\n# ${dateStr}\n\n`)
		await get().refreshFiles()
		return filePath
	},
}))
