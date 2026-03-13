import type {
	ConflictInfo,
	ConflictResolution,
	InitialSyncProgressEvent,
	SyncEngineState,
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
	restoreVersion: (
		vaultId: string,
		vaultPath: string,
		filePath: string,
		version: string,
	) => Promise<void>
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

			startSync: async (vaultId, vaultPath, serverUrl) => {
				try {
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

				set((state) => {
					state.unlisteners = [
						unlistenState,
						unlistenFile,
						unlistenProgress,
						unlistenConflict,
						unlistenComplete,
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
