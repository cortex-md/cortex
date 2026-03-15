import type {
	ConflictInfo,
	ConflictResolution,
	InitialSyncProgressEvent,
	SyncEngineState,
	SyncPreferences,
	VaultEncryptionStatus,
	VersionInfo,
} from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface SyncState {
	engineState: SyncEngineState
	syncingFiles: Record<string, string>
	lastSyncedAt: number | null
	error: string | null
	unlisteners: Array<() => void>
	conflicts: Record<string, ConflictInfo>
	initialSyncProgress: InitialSyncProgressEvent | null
	initialSyncComplete: boolean
	vekRequired: boolean
	syncPreferences: SyncPreferences

	loadSyncPreferences: (vaultPath: string) => Promise<void>
	updateSyncPreference: (
		key: keyof Omit<SyncPreferences, "excludedPaths">,
		value: boolean,
	) => Promise<void>
	toggleExcludedPath: (relativePath: string, excluded: boolean) => Promise<void>
	isPathExcluded: (relativePath: string) => boolean
	startSync: (vaultId: string, vaultPath: string, serverUrl: string) => Promise<void>
	stopSync: () => Promise<void>
	forceSyncFile: (path: string) => Promise<void>
	resolveConflict: (path: string, resolution: ConflictResolution) => Promise<void>
	loadConflicts: (vaultId: string, vaultPath: string) => Promise<void>
	getVersionHistory: (
		vaultId: string,
		vaultPath: string,
		filePath: string,
	) => Promise<VersionInfo[]>
	downloadVersion: (
		vaultId: string,
		vaultPath: string,
		filePath: string,
		version: string,
	) => Promise<string>
	restoreVersion: (
		vaultId: string,
		vaultPath: string,
		filePath: string,
		version: string,
	) => Promise<void>
	checkVaultEncryption: (vaultId: string) => Promise<VaultEncryptionStatus>
	createVaultKey: (vaultId: string, password: string) => Promise<void>
	unlockVaultKey: (vaultId: string, password: string) => Promise<void>
	subscribeEvents: () => Promise<void>
	unsubscribeEvents: () => void
}

export const useSyncStore = create<SyncState>()(
	devtools(
		immer((set, get) => ({
			engineState: "idle" as SyncEngineState,
			syncingFiles: {},
			lastSyncedAt: null,
			error: null,
			unlisteners: [],
			conflicts: {},
			initialSyncProgress: null,
			initialSyncComplete: false,
			vekRequired: false,
			syncPreferences: {
				syncSettings: false,
				syncHotkeys: false,
				syncWorkspace: false,
				syncPluginMetadata: false,
				syncThemeMetadata: false,
				excludedPaths: [],
			},

			loadSyncPreferences: async (vaultPath) => {
				const platform = getPlatform()
				const filePath = `${vaultPath}/.cortex/sync-preferences.json`
				try {
					const content = await platform.fs.readFile(filePath)
					const parsed = JSON.parse(content) as Partial<SyncPreferences>
					const prefs: SyncPreferences = {
						syncSettings: parsed.syncSettings ?? false,
						syncHotkeys: parsed.syncHotkeys ?? false,
						syncWorkspace: parsed.syncWorkspace ?? false,
						syncPluginMetadata: parsed.syncPluginMetadata ?? false,
						syncThemeMetadata: parsed.syncThemeMetadata ?? false,
						excludedPaths: Array.isArray(parsed.excludedPaths) ? parsed.excludedPaths : [],
					}
					set((state) => {
						state.syncPreferences = prefs
					})
					await platform.sync.updateSyncPreferences(prefs)
				} catch {
					const defaults: SyncPreferences = {
						syncSettings: false,
						syncHotkeys: false,
						syncWorkspace: false,
						syncPluginMetadata: false,
						syncThemeMetadata: false,
						excludedPaths: [],
					}
					set((state) => {
						state.syncPreferences = defaults
					})
					await platform.sync.updateSyncPreferences(defaults)
				}
			},

			updateSyncPreference: async (key, value) => {
				const platform = getPlatform()
				set((state) => {
					;(state.syncPreferences as Record<string, unknown>)[key] = value
				})
				const prefs = get().syncPreferences
				const { vault } = await import("./vaultStore").then((m) => m.useVaultStore.getState())
				if (vault) {
					const filePath = `${vault.path}/.cortex/sync-preferences.json`
					await platform.fs.writeFile(filePath, JSON.stringify(prefs, null, "\t"))
				}
				await platform.sync.updateSyncPreferences(prefs)
			},

			toggleExcludedPath: async (relativePath, excluded) => {
				const platform = getPlatform()
				set((state) => {
					const paths = state.syncPreferences.excludedPaths
					if (excluded) {
						if (!paths.includes(relativePath)) {
							paths.push(relativePath)
						}
					} else {
						state.syncPreferences.excludedPaths = paths.filter((p) => p !== relativePath)
					}
				})
				const prefs = get().syncPreferences
				const { vault } = await import("./vaultStore").then((m) => m.useVaultStore.getState())
				if (vault) {
					const filePath = `${vault.path}/.cortex/sync-preferences.json`
					await platform.fs.writeFile(filePath, JSON.stringify(prefs, null, "\t"))
				}
				await platform.sync.updateSyncPreferences(prefs)
			},

			isPathExcluded: (relativePath) => {
				const { excludedPaths } = get().syncPreferences
				for (const excluded of excludedPaths) {
					if (excluded.endsWith("/")) {
						if (relativePath.startsWith(excluded)) return true
					} else if (relativePath === excluded) {
						return true
					}
				}
				return false
			},

			startSync: async (vaultId, vaultPath, serverUrl) => {
				try {
					await get().loadSyncPreferences(vaultPath)
					const platform = getPlatform()
					await platform.sync.start(vaultId, vaultPath, serverUrl)
					await get().subscribeEvents()
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			stopSync: async () => {
				try {
					get().unsubscribeEvents()
					const platform = getPlatform()
					await platform.sync.stop()
					set((state) => {
						state.engineState = "idle"
						state.syncingFiles = {}
						state.conflicts = {}
						state.initialSyncProgress = null
						state.initialSyncComplete = false
						state.vekRequired = false
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			forceSyncFile: async (path) => {
				try {
					const platform = getPlatform()
					await platform.sync.forceSyncFile(path)
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			resolveConflict: async (path, resolution) => {
				try {
					const platform = getPlatform()
					await platform.sync.resolveConflict(path, resolution)
					set((state) => {
						delete state.conflicts[path]
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			loadConflicts: async (vaultId, vaultPath) => {
				try {
					const platform = getPlatform()
					const conflictList = await platform.sync.getConflicts(vaultId, vaultPath)
					set((state) => {
						state.conflicts = {}
						for (const conflict of conflictList) {
							state.conflicts[conflict.filePath] = conflict
						}
					})
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			getVersionHistory: async (vaultId, vaultPath, filePath) => {
				const platform = getPlatform()
				return platform.sync.getVersionHistory(vaultId, vaultPath, filePath)
			},

			downloadVersion: async (vaultId, vaultPath, filePath, version) => {
				const platform = getPlatform()
				return platform.sync.downloadVersion(vaultId, vaultPath, filePath, version)
			},

			restoreVersion: async (vaultId, vaultPath, filePath, version) => {
				try {
					const platform = getPlatform()
					await platform.sync.restoreVersion(vaultId, vaultPath, filePath, version)
				} catch (e) {
					set((state) => {
						state.error = String(e)
					})
				}
			},

			checkVaultEncryption: async (vaultId) => {
				const platform = getPlatform()
				return platform.sync.checkVaultEncryption(vaultId)
			},

			createVaultKey: async (vaultId, password) => {
				const platform = getPlatform()
				await platform.sync.createVaultKey(vaultId, password)
			},

			unlockVaultKey: async (vaultId, password) => {
				const platform = getPlatform()
				await platform.sync.unlockVaultKey(vaultId, password)
				set((state) => {
					state.vekRequired = false
				})
			},

			subscribeEvents: async () => {
				const platform = getPlatform()

				const unlistenState = await platform.sync.onStateChanged((event) => {
					set((state) => {
						state.engineState = event.state
						if (event.state === "live") {
							state.lastSyncedAt = Date.now()
						}
					})
				})

				const unlistenFile = await platform.sync.onFileEvent((event) => {
					set((state) => {
						if (event.status === "synced" || event.status === "merged") {
							delete state.syncingFiles[event.path]
							state.lastSyncedAt = Date.now()
						} else if (event.status === "conflict") {
							state.syncingFiles[event.path] = event.status
						} else {
							state.syncingFiles[event.path] = event.status
						}
					})
				})

				const unlistenProgress = await platform.sync.onInitialSyncProgress((event) => {
					set((state) => {
						state.initialSyncProgress = event
					})
				})

				const unlistenConflict = await platform.sync.onConflict((event) => {
					set((state) => {
						state.conflicts[event.path] = {
							filePath: event.path,
							localHash: "",
							remoteHash: "",
							ancestorHash: null,
							localContent: null,
							remoteContent: null,
						}
					})
				})

				const unlistenComplete = await platform.sync.onInitialSyncComplete(() => {
					set((state) => {
						state.initialSyncComplete = true
						state.initialSyncProgress = null
					})
				})

				const unlistenVek = await platform.sync.onVekRequired(() => {
					set((state) => {
						state.vekRequired = true
					})
				})

				set((state) => {
					state.unlisteners = [
						unlistenState,
						unlistenFile,
						unlistenProgress,
						unlistenConflict,
						unlistenComplete,
						unlistenVek,
					]
				})
			},

			unsubscribeEvents: () => {
				const { unlisteners } = get()
				for (const unlisten of unlisteners) {
					unlisten()
				}
				set((state) => {
					state.unlisteners = []
				})
			},
		})),
		{ name: "syncStore" },
	),
)
