import type { PluginAPI } from "cortex-plugin-api"
import { createBookmarksAPI } from "./apis/BookmarksAPI"
import { createCommandsAPI } from "./apis/CommandsAPI"
import { createDataAPI } from "./apis/DataAPI"
import { createEditorAPI } from "./apis/EditorAPI"
import { createHotkeysAPI } from "./apis/HotkeysAPI"
import { createMetadataAPI } from "./apis/MetadataAPI"
import { createRendererAPI } from "./apis/RendererAPI"
import { createSettingsAPI } from "./apis/SettingsAPI"
import { createThemeAPI } from "./apis/ThemeAPI"
import { createVaultAPI } from "./apis/VaultAPI"
import { createWorkspaceAPI } from "./apis/WorkspaceAPI"
import { usePluginStore } from "./pluginStore"

export function createPluginAPI(pluginId: string, getVaultPath: () => string | null): PluginAPI {
	const commands = createCommandsAPI(pluginId)
	const settings = createSettingsAPI(pluginId, getVaultPath)
	const vault = createVaultAPI(getVaultPath)
	const data = createDataAPI(pluginId, getVaultPath)
	const editor = createEditorAPI(
		() => null,
		() => null,
	)
	const renderer = createRendererAPI()
	const hotkeys = createHotkeysAPI(pluginId)
	const metadata = createMetadataAPI()
	const theme = createThemeAPI()
	const workspace = createWorkspaceAPI()
	const bookmarks = createBookmarksAPI()

	const settingsWithSchema: PluginAPI["settings"] = {
		...settings,
		defineSchema(schema) {
			usePluginStore.getState().setSettingsSchema(pluginId, schema)
		},
		load: settings.load,
	}

	return {
		commands,
		settings: settingsWithSchema,
		vault,
		data,
		editor,
		renderer,
		hotkeys,
		metadata,
		theme,
		workspace,
		bookmarks,

		ui: {
			registerView(registration) {
				usePluginStore.getState().addView(registration)
				return {
					dispose() {
						usePluginStore.getState().removeView(registration.id)
					},
				}
			},
			registerSidebarItem(item) {
				usePluginStore.getState().addSidebarItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeSidebarItem(item.id)
					},
				}
			},
			registerStatusBarItem(item) {
				usePluginStore.getState().addStatusBarItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeStatusBarItem(item.id)
					},
				}
			},
			registerContextMenuItem(item) {
				usePluginStore.getState().addContextMenuItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeContextMenuItem(item.id)
					},
				}
			},
			registerSettingsTab(tab) {
				usePluginStore.getState().addSettingsTab(tab)
				return {
					dispose() {
						usePluginStore.getState().removeSettingsTab(tab.id)
					},
				}
			},
			registerRibbonAction(action) {
				usePluginStore.getState().addRibbonAction(action)
				return {
					dispose() {
						usePluginStore.getState().removeRibbonAction(action.id)
					},
				}
			},
			showNotice(_message, _duration) {},
		},
	}
}
