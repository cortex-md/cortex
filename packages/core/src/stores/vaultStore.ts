import type { FileEntry, VaultMetadata, VaultRegistryEntry, WatchEvent } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { getSettingsManager, initSettingsManager } from "@cortex/settings"
import { create } from "zustand"
import { noteCache } from "../noteCache"
import { createDefaultFrontmatter } from "../utils/frontmatter"

export type { VaultMetadata, VaultRegistryEntry }

export interface VaultState {
	vault: VaultMetadata | null
	files: FileEntry[]
	fileEvents: WatchEvent[]
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
	applyFileEvent: (event: WatchEvent) => Promise<void>
	consumeFileEvents: () => WatchEvent[]
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
	fileEvents: [],
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
				await get().applyFileEvent(event)
				if (event.kind === "deleted") return
				const hash = await platform.fs.hashFile(event.path).catch(() => null)
				if (hash) await noteCache.handleExternalChange(event.path, hash)
			})

			initSettingsManager()
			await getSettingsManager().loadFromVault(path)

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
			fileEvents: [],
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

	applyFileEvent: async (event) => {
		const { vault } = get()
		if (!vault || !event.path.startsWith(vault.path)) return

		if (event.kind === "deleted") {
			set((state) => ({
				files: state.files.filter(
					(file) => file.path !== event.path && !file.path.startsWith(`${event.path}/`),
				),
				fileEvents: [
					...state.fileEvents,
					...(state.files.some(
						(file) => file.path === event.path || file.path.startsWith(`${event.path}/`),
					)
						? state.files
								.filter(
									(file) => file.path === event.path || file.path.startsWith(`${event.path}/`),
								)
								.map((file) => ({ path: file.path, kind: "deleted" as const }))
						: [event]),
				],
			}))
			return
		}

		const parentPath = event.path.slice(0, event.path.lastIndexOf("/"))
		if (!parentPath) return

		try {
			const entries = await getPlatform().fs.listDir(parentPath)
			const entry = entries.find((file) => file.path === event.path)
			if (!entry) {
				await get().refreshFiles()
				set((state) => ({ fileEvents: [...state.fileEvents, event] }))
				return
			}

			set((state) => {
				const existingIndex = state.files.findIndex((file) => file.path === entry.path)
				const files = [...state.files]
				if (existingIndex >= 0) {
					files[existingIndex] = entry
				} else {
					files.push(entry)
				}
				return { files, fileEvents: [...state.fileEvents, event] }
			})
		} catch (_e) {
			await get().refreshFiles()
			set((state) => ({ fileEvents: [...state.fileEvents, event] }))
		}
	},

	consumeFileEvents: () => {
		const { fileEvents } = get()
		set({ fileEvents: [] })
		return fileEvents
	},

	loadRecentVaults: async () => {
		try {
			const platform = getPlatform()
			const entries = await platform.vault.readVaultRegistry()
			const sorted = [...entries].sort((a, b) => (b.lastOpened ?? 0) - (a.lastOpened ?? 0))
			set({ recentVaults: sorted })
			await platform.vault.refreshMenuRecents().catch(() => {})
		} catch (_e) {}
	},

	removeRecentVault: async (uuid) => {
		try {
			await getPlatform().vault.removeFromVaultRegistry(uuid)
			await get().loadRecentVaults()
		} catch (_e) {}
	},

	createFile: async (parentPath, name) => {
		const platform = getPlatform()
		const fileName = name.endsWith(".md") ? name : `${name}.md`
		const filePath = `${parentPath}/${fileName}`
		const content = createDefaultFrontmatter()
		await platform.fs.writeFile(filePath, content)
		await get().applyFileEvent({ path: filePath, kind: "created" })
		return filePath
	},

	createFolder: async (parentPath, name) => {
		const platform = getPlatform()
		const folderPath = `${parentPath}/${name}`
		await platform.fs.createDir(folderPath)
		await get().applyFileEvent({ path: folderPath, kind: "created" })
		return folderPath
	},

	deleteFile: async (filePath) => {
		const platform = getPlatform()
		await platform.fs.deleteFile(filePath)
		await get().applyFileEvent({ path: filePath, kind: "deleted" })
	},

	renameFile: async (oldPath, newName) => {
		const platform = getPlatform()
		const parentPath = oldPath.substring(0, oldPath.lastIndexOf("/"))
		const newPath = `${parentPath}/${newName}`
		await platform.fs.renameFile(oldPath, newPath)
		await get().applyFileEvent({ path: oldPath, kind: "deleted" })
		await get().applyFileEvent({ path: newPath, kind: "created" })
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
		await get().applyFileEvent({ path: newPath, kind: "created" })
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
			await get().applyFileEvent({ path: dailyDir, kind: "created" })
		}

		const content = createDefaultFrontmatter({
			tags: ["daily"],
			extraFields: { date: dateStr },
		})
		await platform.fs.writeFile(filePath, `${content}\n# ${dateStr}\n\n`)
		await get().applyFileEvent({ path: filePath, kind: "created" })
		return filePath
	},
}))
