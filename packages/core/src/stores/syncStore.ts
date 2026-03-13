import type { SyncEngineState } from "@cortex/platform"
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

	startSync: (vaultId: string, vaultPath: string, serverUrl: string) => Promise<void>
	stopSync: () => Promise<void>
	forceSyncFile: (path: string) => Promise<void>
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
						if (event.status === "synced") {
							delete state.syncingFiles[event.path]
							state.lastSyncedAt = Date.now()
						} else {
							state.syncingFiles[event.path] = event.status
						}
					})
				})

				set((state) => {
					state.unlisteners = [unlistenState, unlistenFile]
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
