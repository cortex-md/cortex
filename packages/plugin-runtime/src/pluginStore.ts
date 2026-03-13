import type {
	ContextMenuItemRegistration,
	PluginManifest,
	PluginSettingDefinition,
	RibbonActionRegistration,
	SettingsTabRegistration,
	SidebarItemRegistration,
	StatusBarItemRegistration,
	ViewRegistration,
} from "@cortex/plugin-api"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export type PluginStatus = "discovered" | "loaded" | "enabled" | "disabled" | "error"

export interface PluginRecord {
	manifest: PluginManifest
	status: PluginStatus
	error?: string
}

export interface PluginStoreState {
	plugins: Record<string, PluginRecord>
	sidebarItems: SidebarItemRegistration[]
	statusBarItems: StatusBarItemRegistration[]
	settingsTabs: SettingsTabRegistration[]
	views: ViewRegistration[]
	contextMenuItems: ContextMenuItemRegistration[]
	ribbonActions: RibbonActionRegistration[]
	settingsSchemas: Record<string, PluginSettingDefinition[]>

	setPluginStatus: (pluginId: string, status: PluginStatus, error?: string) => void
	registerPlugin: (manifest: PluginManifest) => void
	unregisterPlugin: (pluginId: string) => void

	addSidebarItem: (item: SidebarItemRegistration) => void
	removeSidebarItem: (itemId: string) => void
	addStatusBarItem: (item: StatusBarItemRegistration) => void
	removeStatusBarItem: (itemId: string) => void
	addSettingsTab: (tab: SettingsTabRegistration) => void
	removeSettingsTab: (tabId: string) => void
	addView: (view: ViewRegistration) => void
	removeView: (viewId: string) => void
	addContextMenuItem: (item: ContextMenuItemRegistration) => void
	removeContextMenuItem: (itemId: string) => void
	addRibbonAction: (action: RibbonActionRegistration) => void
	removeRibbonAction: (actionId: string) => void
	setSettingsSchema: (pluginId: string, schema: PluginSettingDefinition[]) => void
	removeSettingsSchema: (pluginId: string) => void

	reset: () => void
}

const initialState = {
	plugins: {} as Record<string, PluginRecord>,
	sidebarItems: [] as SidebarItemRegistration[],
	statusBarItems: [] as StatusBarItemRegistration[],
	settingsTabs: [] as SettingsTabRegistration[],
	views: [] as ViewRegistration[],
	contextMenuItems: [] as ContextMenuItemRegistration[],
	ribbonActions: [] as RibbonActionRegistration[],
	settingsSchemas: {} as Record<string, PluginSettingDefinition[]>,
}

export const usePluginStore = create<PluginStoreState>()(
	devtools(
		immer((set) => ({
			...initialState,

			setPluginStatus: (pluginId, status, error) =>
				set((state) => {
					const plugin = state.plugins[pluginId]
					if (plugin) {
						plugin.status = status
						plugin.error = error
					}
				}),

			registerPlugin: (manifest) =>
				set((state) => {
					state.plugins[manifest.id] = { manifest, status: "loaded" }
				}),

			unregisterPlugin: (pluginId) =>
				set((state) => {
					delete state.plugins[pluginId]
				}),

			addSidebarItem: (item) =>
				set((state) => {
					state.sidebarItems.push(item)
				}),
			removeSidebarItem: (itemId) =>
				set((state) => {
					state.sidebarItems = state.sidebarItems.filter((i) => i.id !== itemId)
				}),

			addStatusBarItem: (item) =>
				set((state) => {
					state.statusBarItems.push(item)
				}),
			removeStatusBarItem: (itemId) =>
				set((state) => {
					state.statusBarItems = state.statusBarItems.filter((i) => i.id !== itemId)
				}),

			addSettingsTab: (tab) =>
				set((state) => {
					state.settingsTabs.push(tab)
				}),
			removeSettingsTab: (tabId) =>
				set((state) => {
					state.settingsTabs = state.settingsTabs.filter((t) => t.id !== tabId)
				}),

			addView: (view) =>
				set((state) => {
					state.views.push(view)
				}),
			removeView: (viewId) =>
				set((state) => {
					state.views = state.views.filter((v) => v.id !== viewId)
				}),

			addContextMenuItem: (item) =>
				set((state) => {
					state.contextMenuItems.push(item)
				}),
			removeContextMenuItem: (itemId) =>
				set((state) => {
					state.contextMenuItems = state.contextMenuItems.filter((i) => i.id !== itemId)
				}),

			addRibbonAction: (action) =>
				set((state) => {
					state.ribbonActions.push(action)
				}),
			removeRibbonAction: (actionId) =>
				set((state) => {
					state.ribbonActions = state.ribbonActions.filter((a) => a.id !== actionId)
				}),

			setSettingsSchema: (pluginId, schema) =>
				set((state) => {
					state.settingsSchemas[pluginId] = schema
				}),
			removeSettingsSchema: (pluginId) =>
				set((state) => {
					delete state.settingsSchemas[pluginId]
				}),

			reset: () => set(initialState),
		})),
		{ name: "pluginStore" },
	),
)
