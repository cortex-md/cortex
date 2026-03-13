import type { PluginAPI } from "@cortex/plugin-api"
import { createCommandsAPI } from "./apis/CommandsAPI"
import { createDataAPI } from "./apis/DataAPI"
import { createSettingsAPI } from "./apis/SettingsAPI"
import { createVaultAPI } from "./apis/VaultAPI"
import { usePluginStore } from "./pluginStore"

function notImplemented(apiName: string): never {
	throw new Error(`PluginAPI.${apiName} is not yet implemented`)
}

export function createPluginAPI(pluginId: string, getVaultPath: () => string | null): PluginAPI {
	const commands = createCommandsAPI(pluginId)
	const settings = createSettingsAPI(pluginId, getVaultPath)
	const vault = createVaultAPI(getVaultPath)
	const data = createDataAPI(pluginId, getVaultPath)

	const settingsWithSchema: PluginAPI["settings"] = {
		...settings,
		defineSchema(schema) {
			usePluginStore.getState().setSettingsSchema(pluginId, schema)
		},
	}

	return {
		commands,
		settings: settingsWithSchema,
		vault,
		data,

		editor: {
			registerExtension() {
				notImplemented("editor.registerExtension")
			},
			getActiveFilePath() {
				notImplemented("editor.getActiveFilePath")
			},
			getActiveFileContent() {
				notImplemented("editor.getActiveFileContent")
			},
			insertAtCursor() {
				notImplemented("editor.insertAtCursor")
			},
			replaceSelection() {
				notImplemented("editor.replaceSelection")
			},
		},

		renderer: {
			registerPlugin() {
				notImplemented("renderer.registerPlugin")
			},
			registerCodeBlockProcessor() {
				notImplemented("renderer.registerCodeBlockProcessor")
			},
		},

		ui: {
			registerView(registration) {
				const store = usePluginStore.getState()
				store.addView(registration)
				return {
					dispose() {
						usePluginStore.getState().removeView(registration.id)
					},
				}
			},
			registerSidebarItem(item) {
				const store = usePluginStore.getState()
				store.addSidebarItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeSidebarItem(item.id)
					},
				}
			},
			registerStatusBarItem(item) {
				const store = usePluginStore.getState()
				store.addStatusBarItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeStatusBarItem(item.id)
					},
				}
			},
			registerContextMenuItem(item) {
				const store = usePluginStore.getState()
				store.addContextMenuItem(item)
				return {
					dispose() {
						usePluginStore.getState().removeContextMenuItem(item.id)
					},
				}
			},
			registerSettingsTab(tab) {
				const store = usePluginStore.getState()
				store.addSettingsTab(tab)
				return {
					dispose() {
						usePluginStore.getState().removeSettingsTab(tab.id)
					},
				}
			},
			registerRibbonAction(action) {
				const store = usePluginStore.getState()
				store.addRibbonAction(action)
				return {
					dispose() {
						usePluginStore.getState().removeRibbonAction(action.id)
					},
				}
			},
			showNotice(_message, _duration) {
				// Will be implemented with toast/notice system
			},
		},

		hotkeys: {
			register() {
				notImplemented("hotkeys.register")
			},
		},

		metadata: {
			async getFrontmatter() {
				notImplemented("metadata.getFrontmatter")
			},
			async getTags() {
				notImplemented("metadata.getTags")
			},
			getAllTags() {
				notImplemented("metadata.getAllTags")
			},
		},

		theme: {
			register() {
				notImplemented("theme.register")
			},
			getActiveThemeName() {
				notImplemented("theme.getActiveThemeName")
			},
			onThemeChange() {
				notImplemented("theme.onThemeChange")
			},
		},

		workspace: {
			openFile() {
				notImplemented("workspace.openFile")
			},
			getOpenFiles() {
				notImplemented("workspace.getOpenFiles")
			},
			onActiveFileChange() {
				notImplemented("workspace.onActiveFileChange")
			},
		},
	}
}
