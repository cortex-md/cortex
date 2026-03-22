import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import { installPlugin, installTheme, uninstallPlugin, uninstallTheme } from "./installService"
import {
	fetchPluginRegistry,
	fetchReadme,
	fetchThemeRegistry,
	invalidateRegistryCache,
} from "./registryService"
import type { RegistryEntry } from "./types"

export interface MarketplaceCallbacks {
	getPluginsDir: () => string | null
	getThemesDir: () => string | null
	reloadPlugins: (dir: string) => Promise<void>
	reloadThemes: (dir: string) => Promise<void>
	isPluginInstalled: (id: string) => boolean
	isThemeInstalled: (id: string) => boolean
}

let callbacks: MarketplaceCallbacks | null = null

export function setMarketplaceCallbacks(cbs: MarketplaceCallbacks): void {
	callbacks = cbs
}

export type MarketplaceTab = "plugins" | "themes"

export interface MarketplaceState {
	pluginEntries: RegistryEntry[]
	themeEntries: RegistryEntry[]
	activeTab: MarketplaceTab
	searchQuery: string
	selectedEntryId: string | null
	loadingEntryId: string | null
	registryError: string | null
	readmeCache: Record<string, string>
	readmeLoading: boolean

	setActiveTab: (tab: MarketplaceTab) => void
	setSearchQuery: (query: string) => void
	selectEntry: (id: string | null) => void
	loadRegistry: () => Promise<void>
	refreshRegistry: () => Promise<void>
	installEntry: (entry: RegistryEntry) => Promise<void>
	uninstallEntry: (entry: RegistryEntry) => Promise<void>
	loadReadme: (entry: RegistryEntry) => Promise<void>
}

export const useMarketplaceStore = create<MarketplaceState>()(
	devtools(
		immer((set, get) => ({
			pluginEntries: [],
			themeEntries: [],
			activeTab: "plugins" as MarketplaceTab,
			searchQuery: "",
			selectedEntryId: null,
			loadingEntryId: null,
			registryError: null,
			readmeCache: {},
			readmeLoading: false,

			setActiveTab: (tab) =>
				set((s) => {
					s.activeTab = tab
					s.searchQuery = ""
					s.selectedEntryId = null
				}),

			setSearchQuery: (query) =>
				set((s) => {
					s.searchQuery = query
				}),

			selectEntry: (id) =>
				set((s) => {
					s.selectedEntryId = id
				}),

			loadRegistry: async () => {
				if (get().pluginEntries.length > 0 && get().themeEntries.length > 0) return
				try {
					const [plugins, themes] = await Promise.all([fetchPluginRegistry(), fetchThemeRegistry()])
					set((s) => {
						s.pluginEntries = plugins
						s.themeEntries = themes
						s.registryError = null
					})
				} catch (e) {
					set((s) => {
						s.registryError = String(e)
					})
				}
			},

			refreshRegistry: async () => {
				invalidateRegistryCache()
				set((s) => {
					s.pluginEntries = []
					s.themeEntries = []
					s.registryError = null
				})
				await get().loadRegistry()
			},

			installEntry: async (entry) => {
				if (!callbacks) return
				const { activeTab } = get()
				set((s) => {
					s.loadingEntryId = entry.id
				})
				try {
					if (activeTab === "plugins") {
						const dir = callbacks.getPluginsDir()
						if (!dir) return
						await installPlugin(entry, dir, callbacks.reloadPlugins)
					} else {
						const dir = callbacks.getThemesDir()
						if (!dir) return
						await installTheme(entry, dir, callbacks.reloadThemes)
					}
				} finally {
					set((s) => {
						s.loadingEntryId = null
					})
				}
			},

			uninstallEntry: async (entry) => {
				if (!callbacks) return
				const { activeTab } = get()
				set((s) => {
					s.loadingEntryId = entry.id
				})
				try {
					if (activeTab === "plugins") {
						const dir = callbacks.getPluginsDir()
						if (!dir) return
						await uninstallPlugin(entry.id, dir)
					} else {
						const dir = callbacks.getThemesDir()
						if (!dir) return
						await uninstallTheme(entry.id, dir)
					}
				} finally {
					set((s) => {
						s.loadingEntryId = null
					})
				}
			},

			loadReadme: async (entry) => {
				const cached = get().readmeCache[entry.id]
				if (cached !== undefined) return
				set((s) => {
					s.readmeLoading = true
				})
				try {
					const readme = await fetchReadme(entry.repo)
					set((s) => {
						s.readmeCache[entry.id] = readme
						s.readmeLoading = false
					})
				} catch {
					set((s) => {
						s.readmeCache[entry.id] = ""
						s.readmeLoading = false
					})
				}
			},
		})),
		{ name: "marketplaceStore" },
	),
)

export function isEntryInstalled(id: string, tab: MarketplaceTab): boolean {
	if (!callbacks) return false
	return tab === "plugins" ? callbacks.isPluginInstalled(id) : callbacks.isThemeInstalled(id)
}
