import { create } from "zustand"
import { getSettingsManager } from "./SettingsManager"
import type { AppSettings } from "./types"
import { AppSettingsSchema } from "./types"

interface SettingsState {
	settings: AppSettings
	isLoading: boolean
	error: string | null
	loadSettings: (vaultPath: string) => Promise<void>
	updateSetting: <K extends keyof AppSettings>(
		section: K,
		key: keyof AppSettings[K],
		value: unknown,
	) => Promise<void>
	getSetting: <K extends keyof AppSettings>(section: K, key: keyof AppSettings[K]) => unknown
	getSectionSettings: <K extends keyof AppSettings>(section: K) => AppSettings[K]
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
	settings: AppSettingsSchema.parse({}),
	isLoading: false,
	error: null,

	loadSettings: async (vaultPath: string) => {
		set({ isLoading: true, error: null })
		try {
			const manager = getSettingsManager()
			await manager.loadFromVault(vaultPath)

			manager.subscribe((event) => {
				set((state) => ({
					settings: {
						...state.settings,
						[event.section]: {
							...state.settings[event.section],
							[event.key]: event.newValue,
						},
					},
				}))
			})

			set({ settings: manager.getAll(), isLoading: false })
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : "Failed to load settings",
				isLoading: false,
			})
		}
	},

	updateSetting: async (section, key, value) => {
		const manager = getSettingsManager()
		await manager.set(section, key, value)
	},

	getSetting: (section, key) => {
		const manager = getSettingsManager()
		return manager.get(section, key)
	},

	getSectionSettings: (section) => {
		return get().settings[section]
	},
}))
