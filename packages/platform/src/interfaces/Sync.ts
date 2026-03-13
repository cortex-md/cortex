export type SyncEngineState =
	| "idle"
	| "authenticating"
	| "connecting"
	| "syncing"
	| "live"
	| "offline"
	| "recovering"

export interface SyncStateEvent {
	state: SyncEngineState
}

export interface SyncFileEvent {
	path: string
	status: string
}

export interface Sync {
	start(vaultId: string, vaultPath: string, serverUrl: string): Promise<void>
	stop(): Promise<void>
	forceSyncFile(path: string): Promise<void>
	onStateChanged(callback: (event: SyncStateEvent) => void): Promise<() => void>
	onFileEvent(callback: (event: SyncFileEvent) => void): Promise<() => void>
}
