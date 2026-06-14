import { getPlatform } from "@cortex/platform"
import { prepareNoteForSave } from "@cortex/properties"

export type SnapshotTrigger = "auto" | "manual" | "pre-save" | "pre-sync"

export interface Snapshot {
	timestamp: number
	content: string
	trigger: SnapshotTrigger
}

export interface NoteCacheEntry {
	filePath: string
	content: string
	diskContent: string
	mtime: number
	hash: string
	dirty: boolean
	lastAccessed: number
	openTabCount: number
	snapshots: Snapshot[]
}

export type ExternalChangeKind = "overwrite" | "conflict"

export interface ExternalChangeEvent {
	filePath: string
	kind: ExternalChangeKind
	snapshot: Snapshot
}

type ExternalChangeListener = (event: ExternalChangeEvent) => void
type ContentChangeListener = (filePath: string, content: string) => void

interface ExternalChangeLoad {
	latestHash: string
	promise: Promise<void>
}

const EVICTION_IDLE_MS = 15 * 60 * 1000
const EVICTION_INTERVAL_MS = 5 * 60 * 1000
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000
const SNAPSHOT_MAX_PER_FILE = 50
const SNAPSHOT_RETENTION_DAYS = 30
const AUTOSAVE_DEBOUNCE_MS = 2000

class NoteCache {
	private entries = new Map<string, NoteCacheEntry>()
	private saveTimers = new Map<string, ReturnType<typeof setTimeout>>()
	private snapshotTimers = new Map<string, ReturnType<typeof setInterval>>()
	private externalChangeListeners: ExternalChangeListener[] = []
	private contentChangeListeners = new Map<string, Set<ContentChangeListener>>()
	private externalChangeLoads = new Map<string, ExternalChangeLoad>()
	private evictionTimer: ReturnType<typeof setInterval> | null = null

	start() {
		this.evictionTimer = setInterval(() => this.runEviction(), EVICTION_INTERVAL_MS)
	}

	stop() {
		if (this.evictionTimer) {
			clearInterval(this.evictionTimer)
			this.evictionTimer = null
		}
		for (const timer of this.saveTimers.values()) clearTimeout(timer)
		for (const timer of this.snapshotTimers.values()) clearInterval(timer)
		this.saveTimers.clear()
		this.snapshotTimers.clear()
	}

	async read(filePath: string): Promise<string> {
		const entry = this.entries.get(filePath)
		if (entry && !entry.dirty) {
			entry.lastAccessed = Date.now()
			return entry.content
		}

		const platform = getPlatform()
		const content = await platform.fs.readFile(filePath)
		const hash = await platform.fs.hashFile(filePath)

		const now = Date.now()
		if (entry) {
			entry.content = content
			entry.diskContent = content
			entry.hash = hash
			entry.lastAccessed = now
		} else {
			this.entries.set(filePath, {
				filePath,
				content,
				diskContent: content,
				mtime: now,
				hash,
				dirty: false,
				lastAccessed: now,
				openTabCount: 0,
				snapshots: [],
			})
		}

		return content
	}

	write(filePath: string, content: string) {
		const entry = this.entries.get(filePath)
		if (!entry) return

		entry.content = content
		entry.dirty = content !== entry.diskContent
		entry.lastAccessed = Date.now()

		if (entry.dirty) {
			this.scheduleSave(filePath)
		}
	}

	writeExternal(filePath: string, content: string) {
		const entry = this.entries.get(filePath)
		if (!entry) return

		entry.content = content
		entry.dirty = content !== entry.diskContent
		entry.lastAccessed = Date.now()

		if (entry.dirty) {
			this.scheduleSave(filePath)
		}

		this.notifyContentChange(filePath, content)
	}

	onContentChange(filePath: string, listener: ContentChangeListener): () => void {
		if (!this.contentChangeListeners.has(filePath)) {
			this.contentChangeListeners.set(filePath, new Set())
		}
		this.contentChangeListeners.get(filePath)!.add(listener)
		return () => {
			const listeners = this.contentChangeListeners.get(filePath)
			if (listeners) {
				listeners.delete(listener)
				if (listeners.size === 0) this.contentChangeListeners.delete(filePath)
			}
		}
	}

	private notifyContentChange(filePath: string, content: string) {
		const listeners = this.contentChangeListeners.get(filePath)
		if (listeners) {
			for (const listener of listeners) listener(filePath, content)
		}
	}

	private scheduleSave(filePath: string) {
		const existing = this.saveTimers.get(filePath)
		if (existing) clearTimeout(existing)

		const timer = setTimeout(() => {
			this.saveTimers.delete(filePath)
			this.flush(filePath)
		}, AUTOSAVE_DEBOUNCE_MS)

		this.saveTimers.set(filePath, timer)
	}

	async flush(filePath: string): Promise<void> {
		const entry = this.entries.get(filePath)
		if (!entry || !entry.dirty) return

		const timer = this.saveTimers.get(filePath)
		if (timer) {
			clearTimeout(timer)
			this.saveTimers.delete(filePath)
		}

		const platform = getPlatform()
		const preparedContent = await prepareNoteForSave(filePath, entry.content)
		if (preparedContent !== entry.content) {
			entry.content = preparedContent
			this.notifyContentChange(filePath, preparedContent)
		}
		this.takeSnapshot(filePath, "pre-save")
		await platform.fs.writeFile(filePath, entry.content)
		const hash = await platform.fs.hashFile(filePath)

		entry.diskContent = entry.content
		entry.dirty = false
		entry.hash = hash
		entry.mtime = Date.now()
	}

	async flushAll(): Promise<void> {
		const dirtyPaths = Array.from(this.entries.entries())
			.filter(([, e]) => e.dirty)
			.map(([p]) => p)

		await Promise.all(dirtyPaths.map((p) => this.flush(p)))
	}

	renamePath(oldPath: string, newPath: string) {
		if (oldPath === newPath) return
		const entry = this.entries.get(oldPath)
		if (!entry) return

		const saveTimer = this.saveTimers.get(oldPath)
		if (saveTimer) {
			clearTimeout(saveTimer)
			this.saveTimers.delete(oldPath)
		}
		this.stopSnapshotTimer(oldPath)
		this.entries.delete(oldPath)

		entry.filePath = newPath
		this.entries.set(newPath, entry)

		if (entry.dirty) this.scheduleSave(newPath)
		if (entry.openTabCount > 0) this.startSnapshotTimer(newPath)
	}

	openTab(filePath: string) {
		const entry = this.entries.get(filePath)
		if (entry) {
			entry.openTabCount++
			this.startSnapshotTimer(filePath)
		}
	}

	async closeTab(filePath: string) {
		const entry = this.entries.get(filePath)
		if (!entry) return

		if (entry.dirty) await this.flush(filePath)

		entry.openTabCount = Math.max(0, entry.openTabCount - 1)

		if (entry.openTabCount === 0) {
			this.stopSnapshotTimer(filePath)
		}
	}

	private startSnapshotTimer(filePath: string) {
		if (this.snapshotTimers.has(filePath)) return
		const timer = setInterval(() => {
			this.takeSnapshot(filePath, "auto")
		}, SNAPSHOT_INTERVAL_MS)
		this.snapshotTimers.set(filePath, timer)
	}

	private stopSnapshotTimer(filePath: string) {
		const timer = this.snapshotTimers.get(filePath)
		if (timer) {
			clearInterval(timer)
			this.snapshotTimers.delete(filePath)
		}
	}

	takeSnapshot(filePath: string, trigger: SnapshotTrigger): Snapshot | null {
		const entry = this.entries.get(filePath)
		if (!entry) return null

		const snapshot: Snapshot = {
			timestamp: Date.now(),
			content: entry.content,
			trigger,
		}

		entry.snapshots.push(snapshot)
		this.pruneSnapshots(entry)
		return snapshot
	}

	private pruneSnapshots(entry: NoteCacheEntry) {
		const retentionMs = SNAPSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000
		const cutoff = Date.now() - retentionMs
		entry.snapshots = entry.snapshots
			.filter((s) => s.timestamp > cutoff)
			.slice(-SNAPSHOT_MAX_PER_FILE)
	}

	handleExternalChange(filePath: string, newHash: string): Promise<void> {
		const existing = this.externalChangeLoads.get(filePath)
		if (existing) {
			existing.latestHash = newHash
			return existing.promise
		}
		const load = {
			latestHash: newHash,
			promise: Promise.resolve(),
		}
		load.promise = this.processExternalChanges(filePath, load).finally(() => {
			this.externalChangeLoads.delete(filePath)
		})
		this.externalChangeLoads.set(filePath, load)
		return load.promise
	}

	private async processExternalChanges(filePath: string, load: ExternalChangeLoad): Promise<void> {
		let processedHash: string | null = null
		while (processedHash !== load.latestHash) {
			const targetHash: string = load.latestHash
			const entry = this.entries.get(filePath)
			if (!entry || targetHash === entry.hash) return
			if (entry.dirty) {
				const snapshot = this.takeSnapshot(filePath, "pre-sync")
				if (snapshot) this.notifyExternalChange({ filePath, kind: "conflict", snapshot })
				return
			}

			const platform = getPlatform()
			const content = await platform.fs.readFile(filePath)
			const actualHash = await platform.fs.hashFile(filePath)
			const contentChanged = content !== entry.content
			entry.content = content
			entry.diskContent = content
			entry.hash = actualHash
			entry.mtime = Date.now()
			processedHash = targetHash

			if (contentChanged) {
				this.notifyContentChange(filePath, content)
				this.notifyExternalChange({
					filePath,
					kind: "overwrite",
					snapshot: { timestamp: Date.now(), content, trigger: "auto" },
				})
			}
		}
	}

	private notifyExternalChange(event: ExternalChangeEvent) {
		for (const listener of this.externalChangeListeners) listener(event)
	}

	onExternalChange(listener: ExternalChangeListener): () => void {
		this.externalChangeListeners.push(listener)
		return () => {
			this.externalChangeListeners = this.externalChangeListeners.filter((l) => l !== listener)
		}
	}

	private async runEviction() {
		const now = Date.now()
		const toEvict: string[] = []

		for (const [path, entry] of this.entries) {
			if (entry.openTabCount > 0) continue
			if (now - entry.lastAccessed > EVICTION_IDLE_MS) {
				toEvict.push(path)
			}
		}

		for (const path of toEvict) {
			await this.flush(path)
			this.entries.delete(path)
		}
	}

	getEntry(filePath: string): NoteCacheEntry | undefined {
		return this.entries.get(filePath)
	}

	getSnapshots(filePath: string): Snapshot[] {
		return this.entries.get(filePath)?.snapshots ?? []
	}

	isDirty(filePath: string): boolean {
		return this.entries.get(filePath)?.dirty ?? false
	}

	clear() {
		this.stop()
		this.entries.clear()
		this.externalChangeLoads.clear()
	}
}

export const noteCache = new NoteCache()
