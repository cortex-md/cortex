import { getPlatform } from "@cortex/platform"
import type { AppSettings, SettingsChangeEvent } from "./types"
import { AppSettingsSchema } from "./types"

export class SettingsManager {
	private cache: AppSettings
	private listeners: Set<(event: SettingsChangeEvent) => void> = new Set()
	private saveTimeout: ReturnType<typeof setTimeout> | null = null
	private vaultPath: string | null = null

	constructor(initial: Partial<AppSettings> = {}) {
		this.cache = AppSettingsSchema.parse(initial)
	}

	async loadFromVault(vaultPath: string): Promise<void> {
		this.vaultPath = vaultPath
		try {
			const platform = getPlatform()
			const content = await platform.fs.readFile(`${vaultPath}/.cortex/app.json`)
			const parsed = JSON.parse(content)
			this.cache = AppSettingsSchema.parse(parsed)
		} catch {
			this.cache = AppSettingsSchema.parse({})
		}
	}

	get<K extends keyof AppSettings>(section: K, key: keyof AppSettings[K]): unknown {
		return this.cache[section]?.[key as never]
	}

	getSection<K extends keyof AppSettings>(section: K): AppSettings[K] {
		return this.cache[section]
	}

	async set<K extends keyof AppSettings>(
		section: K,
		key: keyof AppSettings[K],
		value: unknown,
	): Promise<void> {
		const oldValue = this.get(section, key)

		;(this.cache[section] as Record<string, unknown>)[key as string] = value

		this.listeners.forEach((listener) => {
			listener({
				section,
				key: key as string,
				oldValue,
				newValue: value,
			})
		})

		this.scheduleFlush()
	}

	private scheduleFlush(): void {
		if (this.saveTimeout) clearTimeout(this.saveTimeout)
		this.saveTimeout = setTimeout(() => this.flush(), 1000)
	}

	async flush(): Promise<void> {
		if (!this.vaultPath) return

		try {
			const platform = getPlatform()
			const content = JSON.stringify(this.cache, null, 2)
			await platform.fs.writeFile(`${this.vaultPath}/.cortex/app.json`, content)
		} catch (error) {
			console.error("Failed to save settings:", error)
		}
	}

	subscribe(listener: (event: SettingsChangeEvent) => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	getAll(): AppSettings {
		return { ...this.cache }
	}
}

let instance: SettingsManager

export function getSettingsManager(): SettingsManager {
	if (!instance) {
		instance = new SettingsManager()
	}
	return instance
}

export function initSettingsManager(initial?: Partial<AppSettings>): SettingsManager {
	if (!instance) {
		instance = new SettingsManager(initial)
	}
	return instance
}
