import {
	type OpenTabOptions,
	useBookmarksStore,
	useEditorStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { reconfigurePluginExtensions } from "@cortex/editor"
import { useHotkeysStore } from "@cortex/hotkeys"
import { setMarketplaceCallbacks } from "@cortex/marketplace"
import { getPlatform } from "@cortex/platform"
import GitHubEmojiPlugin from "@cortex/plugin-github-emoji"
import {
	discoverCommunityPlugins,
	registerBundledPlugin,
	setBookmarksFunctions,
	setDynamicBindingFunctions,
	setHotkeyHandlerFunctions,
	setNotificationFunctions,
	setReconfigurePluginExtensions,
	setSettingsControls,
	setWorkspaceFunctions,
	usePluginStore,
} from "@cortex/plugin-runtime"
import { getThemeManager } from "@cortex/theme"
import { desktopSettingsControls } from "../features/settings/desktopSettingsControls"
import { reloadCommunityThemes } from "../features/themes/communityThemeLoader"
import { sendCoreNotification } from "../utils/nativeNotifications"

type WorkspaceBridge = Parameters<typeof setWorkspaceFunctions>[0]
type WorkspaceOpenOptions = NonNullable<Parameters<WorkspaceBridge["openFile"]>[1]>

function getWorkspaceOpenTabOptions(options?: WorkspaceOpenOptions): OpenTabOptions {
	const target = options?.target ?? "active"
	const openTabOptions: OpenTabOptions = {
		forceNew: options?.newTab,
	}
	if (target === "active") return openTabOptions
	const placement: Record<
		Exclude<WorkspaceOpenOptions["target"], "active" | undefined>,
		Required<Pick<OpenTabOptions, "split" | "splitPosition">>
	> = {
		left: { split: "horizontal", splitPosition: "before" },
		right: { split: "horizontal", splitPosition: "after" },
		top: { split: "vertical", splitPosition: "before" },
		bottom: { split: "vertical", splitPosition: "after" },
	}
	return {
		...openTabOptions,
		paneId: useWorkspaceStore.getState().activePaneId,
		...placement[target],
	}
}

export function initializePluginBridges(): void {
	setReconfigurePluginExtensions(reconfigurePluginExtensions as never)
	setSettingsControls(desktopSettingsControls)
	setHotkeyHandlerFunctions(
		useHotkeysStore.getState().registerHandler,
		useHotkeysStore.getState().unregisterHandler,
	)
	setDynamicBindingFunctions(
		useHotkeysStore.getState().addDynamicBinding,
		useHotkeysStore.getState().removeDynamicBinding,
	)
	setNotificationFunctions({
		isSupported: () => getPlatform().capabilities.includes("notifications"),
		getPermission: () => getPlatform().notifications.getPermission(),
		send: (notification) =>
			getPlatform().notifications.send({
				...notification,
				id: notification.id ? `${notification.pluginId}:${notification.id}` : undefined,
				tag: notification.tag ? `${notification.pluginId}:${notification.tag}` : undefined,
				source: "plugin",
				pluginId: notification.pluginId,
			}),
	})
	setBookmarksFunctions({
		getAll: () => useBookmarksStore.getState().bookmarks,
		add: (filePath) => {
			const vaultPath = useVaultStore.getState().vault?.path
			return vaultPath
				? useBookmarksStore.getState().addBookmark(vaultPath, filePath)
				: Promise.resolve()
		},
		remove: (filePath) => {
			const vaultPath = useVaultStore.getState().vault?.path
			return vaultPath
				? useBookmarksStore.getState().removeBookmark(vaultPath, filePath)
				: Promise.resolve()
		},
		isBookmarked: (filePath) => useBookmarksStore.getState().isBookmarked(filePath),
		subscribe: (callback) =>
			useBookmarksStore.subscribe((state, previousState) => {
				if (state.bookmarks !== previousState.bookmarks) callback(state.bookmarks)
			}),
	})
	setWorkspaceFunctions({
		openFile: (path, options) => {
			useWorkspaceStore.getState().openTab(path, getWorkspaceOpenTabOptions(options))
		},
		openView: (viewId, options) => {
			const registration = usePluginStore.getState().views.find((view) => view.id === viewId)
			useWorkspaceStore
				.getState()
				.openViewTab(viewId, registration?.label ?? viewId, getWorkspaceOpenTabOptions(options))
		},
		getOpenFiles: () =>
			Object.values(useWorkspaceStore.getState().panes).flatMap((pane) =>
				pane.tabs.filter((tab) => tab.tabType === "file").map((tab) => tab.filePath),
			),
		subscribeActiveFile: (callback) =>
			useEditorStore.subscribe((state, previousState) => {
				if (state.activeFilePath !== previousState.activeFilePath) {
					callback(state.activeFilePath)
				}
			}),
	})
	setMarketplaceCallbacks({
		getPluginsDir: () => {
			const vault = useVaultStore.getState().vault
			return vault ? `${vault.path}/.cortex/plugins` : null
		},
		getThemesDir: () => {
			const vault = useVaultStore.getState().vault
			return vault ? `${vault.path}/.cortex/themes` : null
		},
		reloadPlugins: async (directory) => {
			await discoverCommunityPlugins(directory)
		},
		reloadThemes: reloadCommunityThemes,
		isPluginInstalled: (id) => id in usePluginStore.getState().plugins,
		isThemeInstalled: (id) =>
			getThemeManager()
				.getThemeFamilies()
				.some((family) => family.name === id),
		notify: (event) => {
			void sendCoreNotification({
				id: `marketplace:${event.action}:${event.kind}:${event.entryId}`,
				tag: `marketplace:${event.kind}:${event.entryId}`,
				title: event.title,
				body: event.body,
				kind: event.level,
				urgency: event.level === "error" ? "high" : "normal",
			})
		},
	})
	registerBundledPlugin(
		{
			id: "github-emoji",
			name: "GitHub Emoji",
			version: "0.1.0",
			minAppVersion: "0.1.0",
			author: "Cortex",
			description: "Convert :emoji_code: to emoji characters in the editor",
			icon: "smile",
			main: "index.ts",
			capabilities: [
				"editor:extensions",
				"markdown:extensions",
				"ui:views",
				"ui:sidebar",
				"ui:statusbar",
				"settings",
				"commands",
			],
		},
		{ default: GitHubEmojiPlugin },
	)
}
