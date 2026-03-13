import type {
	Sync as ISync,
	SyncFileEvent,
	SyncStateEvent,
} from "@cortex/platform"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

export class Sync implements ISync {
	async start(vaultId: string, vaultPath: string, serverUrl: string): Promise<void> {
		await invoke<void>("sync_start", { vaultId, vaultPath, serverUrl })
	}

	async stop(): Promise<void> {
		await invoke<void>("sync_stop")
	}

	async forceSyncFile(path: string): Promise<void> {
		await invoke<void>("sync_force_sync_file", { path })
	}

	async onStateChanged(callback: (event: SyncStateEvent) => void): Promise<() => void> {
		const unlisten = await listen<SyncStateEvent>("sync-state-changed", (e) => {
			callback(e.payload)
		})
		return unlisten
	}

	async onFileEvent(callback: (event: SyncFileEvent) => void): Promise<() => void> {
		const unlisten = await listen<SyncFileEvent>("sync-file-event", (e) => {
			callback(e.payload)
		})
		return unlisten
	}
}
