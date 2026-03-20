export { setBookmarksFunctions } from "./apis/BookmarksAPI"
export {
	type CommandEntry,
	type CommandIcon,
	executeCommand,
	getCommands,
	registerCommand,
} from "./apis/CommandsAPI"
export {
	setEditorViewRef,
	setLivePreviewBuilder,
	setReconfigurePluginExtensions,
} from "./apis/EditorAPI"
export { setDynamicBindingFunctions, setHotkeyHandlerFunctions } from "./apis/HotkeysAPI"
export { setMetadataFunctions } from "./apis/MetadataAPI"
export { getRegisteredRendererPlugins } from "./apis/RendererAPI"
export { setThemeManagerRef } from "./apis/ThemeAPI"
export { setWorkspaceFunctions } from "./apis/WorkspaceAPI"

export {
	disableAllPlugins,
	disablePlugin,
	discoverCommunityPlugins,
	enablePlugin,
	getCommunityPluginsDir,
	getPluginInstance,
	loadEnabledPlugins,
	registerBundledPlugin,
	saveEnabledPlugins,
	setCommunityPluginExternal,
	setCommunityPluginsDir,
} from "./PluginLoader"
export type { PluginRecord, PluginStatus, PluginStoreState } from "./pluginStore"
export { usePluginStore } from "./pluginStore"

export { PluginSettingsRenderer } from "./rendering/PluginSettingsRenderer"
export { PluginViewRenderer } from "./rendering/PluginViewRenderer"
export { type SettingsControlComponents, setSettingsControls } from "./rendering/settingsControls"
