import type { FileEntry, VaultMetadata, VaultRegistryEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import {
	createNoteWithPropertyDefaults,
	getOptionalPropertiesRuntime,
	invalidatePropertySuggestions,
	notifyVaultSchemaChanged,
	prepareDuplicatedNote,
	removeNotePropertiesUiState,
	renameNotePropertiesUiState,
} from "@cortex/properties"
import { getSettingsManager, initSettingsManager } from "@cortex/settings"
import { create } from "zustand"
import { noteCache } from "../noteCache"
import { getPortableFileNameError } from "../utils/fileName"
import { createDefaultFrontmatter } from "../utils/frontmatter"
import { useBookmarksStore } from "./bookmarksStore"
import { useSyncStore } from "./syncStore"
import { useWorkspaceStore } from "./workspaceStore"

export type { VaultMetadata, VaultRegistryEntry }

const WATCHER_REFRESH_DELAY_MS = 200

let watcherRefreshTimer: ReturnType<typeof setTimeout> | null = null
let watcherRefreshPromise: Promise<void> | null = null
let trailingWatcherRefresh: (() => Promise<void>) | null = null
let watcherRefreshGeneration = 0

function isMarkdownPath(path: string): boolean {
	return path.toLocaleLowerCase().endsWith(".md")
}

function isPropertySchemaPath(path: string): boolean {
	const normalized = path.replaceAll("\\", "/")
	return (
		normalized === ".cortex/schema/properties.json" ||
		normalized.endsWith("/.cortex/schema/properties.json")
	)
}

function startWatcherRefresh(refreshFiles: () => Promise<void>, generation: number): void {
	if (watcherRefreshPromise) {
		trailingWatcherRefresh = refreshFiles
		return
	}

	watcherRefreshPromise = (async () => {
		let nextRefresh: (() => Promise<void>) | null = refreshFiles
		while (nextRefresh && generation === watcherRefreshGeneration) {
			await nextRefresh()
			if (generation !== watcherRefreshGeneration) break
			nextRefresh = trailingWatcherRefresh
			trailingWatcherRefresh = null
		}
	})().finally(() => {
		watcherRefreshPromise = null
		const nextRefresh = trailingWatcherRefresh
		trailingWatcherRefresh = null
		if (nextRefresh) startWatcherRefresh(nextRefresh, watcherRefreshGeneration)
	})
}

function scheduleWatcherRefresh(refreshFiles: () => Promise<void>): void {
	if (watcherRefreshTimer) clearTimeout(watcherRefreshTimer)
	const generation = watcherRefreshGeneration
	watcherRefreshTimer = setTimeout(() => {
		watcherRefreshTimer = null
		startWatcherRefresh(refreshFiles, generation)
	}, WATCHER_REFRESH_DELAY_MS)
}

function clearWatcherRefresh(): void {
	if (watcherRefreshTimer) clearTimeout(watcherRefreshTimer)
	watcherRefreshTimer = null
	trailingWatcherRefresh = null
	watcherRefreshGeneration += 1
}

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
				scheduleWatcherRefresh(get().refreshFiles)
				if (isPropertySchemaPath(event.path)) {
					notifyVaultSchemaChanged(path)
				} else if (isMarkdownPath(event.path)) {
					invalidatePropertySuggestions(path)
				}
				if (event.kind !== "created" && event.kind !== "modified") return
				if (!noteCache.getEntry(event.path)) return
				try {
					const hash = await platform.fs.hashFile(event.path)
					await noteCache.handleExternalChange(event.path, hash)
				} catch (error) {
					console.error("[Vault file change failed]", { path: event.path, error })
				}
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
		clearWatcherRefresh()
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
		const content = await createNoteWithPropertyDefaults(
			get().vault?.path ?? parentPath,
			createDefaultFrontmatter(),
		)
		await platform.fs.writeFile(filePath, content)
		await get().refreshFiles()
		invalidatePropertySuggestions(get().vault?.path)
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
		const vaultPath = get().vault?.path
		await platform.fs.deleteFile(filePath)
		if (vaultPath && getOptionalPropertiesRuntime()) {
			await removeNotePropertiesUiState(vaultPath, filePath)
		}
		await get().refreshFiles()
		if (vaultPath && isMarkdownPath(filePath)) invalidatePropertySuggestions(vaultPath)
	},

	renameFile: async (oldPath, newName) => {
		const platform = getPlatform()
		const validationError = getPortableFileNameError(newName)
		if (validationError) throw new Error(validationError)
		const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"))
		const newPath = `${parentPath}/${newName}`
		if (oldPath === newPath) return oldPath

		await noteCache.flush(oldPath)
		await platform.fs.renameFile(oldPath, newPath)
		noteCache.renamePath(oldPath, newPath)
		useWorkspaceStore.getState().updateTabPath(oldPath, newPath)
		const vaultPath = get().vault?.path
		if (vaultPath) {
			await useBookmarksStore.getState().renameBookmark(vaultPath, oldPath, newPath)
			if (getOptionalPropertiesRuntime()) {
				await renameNotePropertiesUiState(vaultPath, oldPath, newPath)
			}
		}
		await get().refreshFiles()
		if (vaultPath && (isMarkdownPath(oldPath) || isMarkdownPath(newPath))) {
			invalidatePropertySuggestions(vaultPath)
		}
		return newPath
	},

	duplicateFile: async (filePath) => {
		const platform = getPlatform()
		const ext = filePath.lastIndexOf(".")
		const basePath = ext > 0 ? filePath.substring(0, ext) : filePath
		const extension = ext > 0 ? filePath.substring(ext) : ""
		const newPath = `${basePath} (copy)${extension}`
		const content = await platform.fs.readFile(filePath)
		const vaultPath = get().vault?.path
		const duplicatedContent = vaultPath ? await prepareDuplicatedNote(vaultPath, content) : content
		await platform.fs.writeFile(newPath, duplicatedContent)
		await get().refreshFiles()
		if (vaultPath && isMarkdownPath(newPath)) invalidatePropertySuggestions(vaultPath)
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

		const content = await createNoteWithPropertyDefaults(
			vault.path,
			createDefaultFrontmatter({
				tags: ["daily"],
				extraFields: { date: dateStr },
			}),
		)
		await platform.fs.writeFile(filePath, `${content}\n# ${dateStr}\n\n`)
		await get().refreshFiles()
		invalidatePropertySuggestions(vault.path)
		return filePath
	},
}))
