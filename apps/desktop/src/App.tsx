import {
	noteCache,
	useAppStore,
	useAuthStore,
	useBookmarksStore,
	useEditorStore,
	useTagsStore,
	useUIStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { buildPluginLivePreview, reconfigurePluginExtensions } from "@cortex/editor"
import { useHotkey, useHotkeyListener, useHotkeysStore } from "@cortex/hotkeys"
import { setMarketplaceCallbacks } from "@cortex/marketplace"
import { getPlatform } from "@cortex/platform"
import GitHubEmojiPlugin from "@cortex/plugin-github-emoji"
import {
	disableAllPlugins,
	discoverCommunityPlugins,
	getCommunityPluginsDir,
	loadEnabledPlugins,
	PluginViewRenderer,
	registerBundledPlugin,
	registerCommand,
	setBookmarksFunctions,
	setCommunityPluginExternal,
	setCommunityPluginsDir,
	setDynamicBindingFunctions,
	setHotkeyHandlerFunctions,
	setLivePreviewBuilder,
	setReconfigurePluginExtensions,
	setSettingsControls,
	setWorkspaceFunctions,
	usePluginStore,
} from "@cortex/plugin-runtime"
import { useSearchStore } from "@cortex/search"
import { useSettingsStore } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
	BookmarkIcon,
	CalendarIcon,
	FileIcon,
	FolderClosed,
	PanelLeftIcon,
	SearchIcon,
	SettingsIcon,
	SunMoonIcon,
	TagIcon,
	TerminalIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { BookmarksSidebar } from "./features/bookmarks/BookmarksSidebar"
import { CommandPalette } from "./features/command-palette/CommandPalette"
import { FileSidebar } from "./features/file-explorer/FileSidebar"
import { type NavItem, SidebarNav } from "./features/file-explorer/SidebarNav"
import { EmptyVaultLayout } from "./features/layout/empty-vault-layout"
import { SplitPaneView } from "./features/layout/SplitPane"
import { MarketplaceModal } from "./features/marketplace"
import { QuickFinder } from "./features/quick-finder/QuickFinder"
import { SearchSidebar } from "./features/search/SearchSidebar"
import { applyAppearanceSettings } from "./features/settings/applyAppearance"
import { desktopSettingsControls } from "./features/settings/desktopSettingsControls"
import { SettingsModal } from "./features/settings/SettingsModal"
import { PaneView } from "./features/split-view/PaneView"
import { StatusBar } from "./features/statusbar/StatusBar"
import { TagPicker } from "./features/tags/TagPicker"
import { TagsSidebar } from "./features/tags/TagsSidebar"
import { loadCommunityThemes, unloadCommunityThemes } from "./features/themes/communityThemeLoader"
import { VaultSwitcher } from "./features/vault/VaultSwitcher"
import { useSyncLifecycle } from "./hooks/useSyncLifecycle"

const CORE_NAV_ITEMS: NavItem[] = [
	{ id: "files", icon: FolderClosed, label: "Files" },
	{ id: "search", icon: SearchIcon, label: "Search" },
	{ id: "bookmarks", icon: BookmarkIcon, label: "Bookmarks" },
	{ id: "tags", icon: TagIcon, label: "Tags" },
]

const NAV_BOTTOM_ITEMS: NavItem[] = [
	{ id: "settings", icon: SettingsIcon, label: "Settings", draggable: false },
]

setReconfigurePluginExtensions(reconfigurePluginExtensions as never)
setLivePreviewBuilder(buildPluginLivePreview as never)
setSettingsControls(desktopSettingsControls)
setHotkeyHandlerFunctions(
	useHotkeysStore.getState().registerHandler,
	useHotkeysStore.getState().unregisterHandler,
)
setDynamicBindingFunctions(
	useHotkeysStore.getState().addDynamicBinding,
	useHotkeysStore.getState().removeDynamicBinding,
)

setBookmarksFunctions({
	getAll: () => useBookmarksStore.getState().bookmarks,
	add: (filePath: string) => {
		const vaultPath = useVaultStore.getState().vault?.path
		if (vaultPath) return useBookmarksStore.getState().addBookmark(vaultPath, filePath)
		return Promise.resolve()
	},
	remove: (filePath: string) => {
		const vaultPath = useVaultStore.getState().vault?.path
		if (vaultPath) return useBookmarksStore.getState().removeBookmark(vaultPath, filePath)
		return Promise.resolve()
	},
	isBookmarked: (filePath: string) => useBookmarksStore.getState().isBookmarked(filePath),
	subscribe: (callback: (bookmarks: string[]) => void) => {
		return useBookmarksStore.subscribe((state, prevState) => {
			if (state.bookmarks !== prevState.bookmarks) {
				callback(state.bookmarks)
			}
		})
	},
})

setWorkspaceFunctions({
	openFile: (path: string) => {
		useWorkspaceStore.getState().openTab(path)
	},
	getOpenFiles: () => {
		const { panes } = useWorkspaceStore.getState()
		return Object.values(panes).flatMap((p) => p.tabs.map((t) => t.filePath))
	},
	subscribeActiveFile: (callback: (path: string | null) => void) => {
		return useEditorStore.subscribe((state, prevState) => {
			if (state.activeFilePath !== prevState.activeFilePath) {
				callback(state.activeFilePath)
			}
		})
	},
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
	reloadPlugins: (dir) => discoverCommunityPlugins(dir),
	reloadThemes: loadCommunityThemes,
	isPluginInstalled: (id) => id in usePluginStore.getState().plugins,
	isThemeInstalled: (id) =>
		getThemeManager()
			.getThemeFamilies()
			.some((f) => f.name === id),
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
			"ui:views",
			"ui:sidebar",
			"ui:statusbar",
			"settings",
			"commands",
		],
	},
	{ default: GitHubEmojiPlugin },
)

export default function App() {
	const {
		vault,
		files,
		recentVaults,
		openVault,
		closeVault,
		loadRecentVaults,
		createFile,
		openDailyNote,
	} = useVaultStore()
	const { loadAppInfo } = useAppStore()
	const { flushActive } = useEditorStore()
	const {
		splitTree,
		resizeSplit,
		closeTab,
		goToTabIndex,
		navigateMRU,
		reopenLastClosed,
		openTab,
		panes,
		activePaneId,
		loadWorkspace,
		persistWorkspace,
		reset,
		suspendInactiveTabs,
	} = useWorkspaceStore()
	const {
		leftSidebarCollapsed,
		leftSidebarWidth,
		leftSidebarView,
		setLeftSidebarWidth,
		setLeftSidebarView,
		toggleLeftSidebar,
		toggleQuickFinder,
		toggleCommandPalette,
		toggleTagPicker,
		settingsOpen,
		openSettings,
		closeSettings,
		marketplaceOpen,
		marketplaceInitialTab,
		closeMarketplace,
	} = useUIStore()
	const { settings, loadSettings } = useSettingsStore()
	const loadOverrides = useHotkeysStore((s) => s.loadOverrides)
	const indexVault = useSearchStore((s) => s.indexVault)
	const resetSearch = useSearchStore((s) => s.reset)
	const buildTagIndex = useTagsStore((s) => s.buildIndex)
	const loadTagColors = useTagsStore((s) => s.loadTagColors)
	const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks)
	const resetBookmarks = useBookmarksStore((s) => s.reset)
	const pluginSidebarItems = usePluginStore((s) => s.sidebarItems)
	const pluginViews = usePluginStore((s) => s.views)
	const [communityThemesLoaded, setCommunityThemesLoaded] = useState(false)

	const navItems = useMemo<NavItem[]>(() => {
		const pluginNavItems: NavItem[] = pluginSidebarItems.map((item) => ({
			id: item.id,
			icon: item.icon,
			label: item.label,
		}))
		return [...CORE_NAV_ITEMS, ...pluginNavItems]
	}, [pluginSidebarItems])

	const sidebarResizing = useRef(false)
	const sidebarResizeStart = useRef({ x: 0, width: 0 })
	const autoOpenAttempted = useRef(false)

	useHotkeyListener()
	useSyncLifecycle()

	useHotkey(
		"file.new",
		useCallback(() => {
			if (vault) createFile(vault.path, "Untitled").then((filePath) => openTab(filePath))
		}, [vault, createFile, openTab]),
	)

	useHotkey(
		"file.close-tab",
		useCallback(() => {
			const pane = panes[activePaneId]
			const activeTabId = pane?.activeTabId
			if (activeTabId) closeTab(activeTabId, activePaneId)
		}, [panes, activePaneId, closeTab]),
	)

	useHotkey("file.reopen-closed", reopenLastClosed)

	useHotkey(
		"navigate.quick-finder",
		useCallback(() => {
			toggleQuickFinder()
		}, [toggleQuickFinder]),
	)

	useHotkey(
		"navigate.command-palette",
		useCallback(() => {
			toggleCommandPalette()
		}, [toggleCommandPalette]),
	)

	useHotkey(
		"navigate.mru-next",
		useCallback(() => navigateMRU(1), [navigateMRU]),
	)

	useHotkey(
		"navigate.mru-prev",
		useCallback(() => navigateMRU(-1), [navigateMRU]),
	)

	useHotkey(
		"navigate.tab-1",
		useCallback(() => goToTabIndex(0), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-2",
		useCallback(() => goToTabIndex(1), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-3",
		useCallback(() => goToTabIndex(2), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-4",
		useCallback(() => goToTabIndex(3), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-5",
		useCallback(() => goToTabIndex(4), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-6",
		useCallback(() => goToTabIndex(5), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-7",
		useCallback(() => goToTabIndex(6), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-8",
		useCallback(() => goToTabIndex(7), [goToTabIndex]),
	)
	useHotkey(
		"navigate.tab-9",
		useCallback(() => goToTabIndex(8), [goToTabIndex]),
	)

	useHotkey("view.toggle-sidebar", toggleLeftSidebar)

	useHotkey(
		"editor.find-in-vault",
		useCallback(() => {
			if (leftSidebarCollapsed) toggleLeftSidebar()
			setLeftSidebarView("search")
		}, [leftSidebarCollapsed, toggleLeftSidebar, setLeftSidebarView]),
	)

	useHotkey(
		"app.settings",
		useCallback(() => openSettings(), [openSettings]),
	)

	useHotkey(
		"tags.toggle-picker",
		useCallback(() => {
			toggleTagPicker()
		}, [toggleTagPicker]),
	)

	useHotkey(
		"navigate.daily-note",
		useCallback(() => {
			openDailyNote().then((filePath) => {
				if (filePath) openTab(filePath)
			})
		}, [openDailyNote, openTab]),
	)

	useEffect(() => {
		const unregister = [
			registerCommand({
				id: "file.new",
				label: "New Note",
				category: "File",
				icon: FileIcon,
				execute: () => {
					if (vault) createFile(vault.path, "Untitled").then((fp) => openTab(fp))
				},
			}),
			registerCommand({
				id: "navigate.quick-finder",
				label: "Quick Finder",
				category: "Navigate",
				icon: SearchIcon,
				execute: toggleQuickFinder,
			}),
			registerCommand({
				id: "editor.find-in-vault",
				label: "Search in Vault",
				category: "Navigate",
				icon: SearchIcon,
				execute: () => {
					if (leftSidebarCollapsed) toggleLeftSidebar()
					setLeftSidebarView("search")
				},
			}),
			registerCommand({
				id: "view.toggle-sidebar",
				label: "Toggle Sidebar",
				category: "View",
				icon: PanelLeftIcon,
				execute: toggleLeftSidebar,
			}),
			registerCommand({
				id: "view.toggle-theme",
				label: "Toggle Colorscheme",
				category: "View",
				icon: SunMoonIcon,
				execute: () => {
					const tm = getThemeManager()
					const currentIsDark = tm.getActiveTheme().isDark
					const familyName = settings.appearance.theme
					const resolved = tm.resolveTheme(familyName, currentIsDark ? "light" : "dark")
					tm.setActiveTheme(resolved)
				},
			}),
			registerCommand({
				id: "app.settings",
				label: "Open Settings",
				category: "App",
				icon: SettingsIcon,
				execute: () => openSettings(),
			}),
			registerCommand({
				id: "navigate.command-palette",
				label: "Command Palette",
				category: "Navigate",
				icon: TerminalIcon,
				execute: toggleCommandPalette,
			}),
			registerCommand({
				id: "tags.toggle-picker",
				label: "Tag Picker",
				category: "Tags",
				icon: TagIcon,
				execute: toggleTagPicker,
			}),
			registerCommand({
				id: "navigate.daily-note",
				label: "Open Daily Note",
				category: "Navigate",
				icon: CalendarIcon,
				execute: () => {
					openDailyNote().then((filePath) => {
						if (filePath) openTab(filePath)
					})
				},
			}),
		]
		return () => {
			for (const fn of unregister) fn()
		}
	}, [
		vault,
		createFile,
		openTab,
		openDailyNote,
		toggleQuickFinder,
		toggleLeftSidebar,
		toggleCommandPalette,
		toggleTagPicker,
		leftSidebarCollapsed,
		setLeftSidebarView,
		settings.appearance.theme,
		openSettings,
	])

	useEffect(() => {
		if (!vault) {
			disableAllPlugins()
			return
		}
		const getVaultPath = () => vault?.path ?? null
		const initPlugins = async () => {
			const [cmState, cmView] = await Promise.all([
				import("@codemirror/state"),
				import("@codemirror/view"),
			])
			setCommunityPluginExternal("@codemirror/state", cmState)
			setCommunityPluginExternal("@codemirror/view", cmView)
			setCommunityPluginsDir(`${vault.path}/.cortex/plugins`)
			await discoverCommunityPlugins(getCommunityPluginsDir())
			await loadEnabledPlugins(vault.path, getVaultPath)
		}
		initPlugins()
	}, [vault])

	useEffect(() => {
		loadAppInfo()
		loadRecentVaults()
	}, [loadAppInfo, loadRecentVaults])

	useEffect(() => {
		const { loadPreferences, checkAuth } = useAuthStore.getState()
		loadPreferences().then(() => checkAuth())

		const unlisten = listen("auth-session-expired", () => {
			useAuthStore.getState().logout()
		})
		return () => {
			unlisten.then((fn) => fn())
		}
	}, [])

	useEffect(() => {
		if (autoOpenAttempted.current || vault) return

		const params = new URLSearchParams(window.location.search)
		const vaultFromUrl = params.get("vault")
		if (vaultFromUrl) {
			autoOpenAttempted.current = true
			openVault(decodeURIComponent(vaultFromUrl))
			return
		}

		if (recentVaults.length === 0) return
		if (!settings.general.autoOpenLastVault) {
			autoOpenAttempted.current = true
			return
		}

		autoOpenAttempted.current = true
		const lastVault = recentVaults[0]
		openVault(lastVault.path, { name: lastVault.name })
	}, [recentVaults, vault, settings.general.autoOpenLastVault, openVault])

	useEffect(() => {
		noteCache.start()

		const handleBeforeUnload = () => {
			noteCache.flushAll()
			flushActive()
		}
		window.addEventListener("beforeunload", handleBeforeUnload)

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload)
			noteCache.stop()
		}
	}, [flushActive])

	useEffect(() => {
		if (!vault) {
			reset()
			resetSearch()
			resetBookmarks()
			return
		}
		loadWorkspace(vault.path)
		loadSettings(vault.path)
		loadOverrides(vault.path)
		loadBookmarks(vault.path)
		loadTagColors(vault.path)
	}, [
		vault,
		loadWorkspace,
		reset,
		resetSearch,
		resetBookmarks,
		loadSettings,
		loadOverrides,
		loadBookmarks,
		loadTagColors,
	])

	useEffect(() => {
		if (!vault || files.length === 0) return
		indexVault(vault.path, files)
		const filePaths = files.filter((f) => !f.isDir).map((f) => f.path)
		buildTagIndex(vault.path, filePaths)
	}, [vault, files, indexVault, buildTagIndex])

	useEffect(() => {
		if (!vault) {
			setCommunityThemesLoaded(false)
			return
		}
		loadCommunityThemes(`${vault.path}/.cortex/themes`).then(() => {
			setCommunityThemesLoaded(true)
		})
		return () => {
			unloadCommunityThemes()
			setCommunityThemesLoaded(false)
		}
	}, [vault])

	useEffect(() => {
		if (!vault || !communityThemesLoaded) return
		applyAppearanceSettings(settings.appearance)

		if (settings.appearance.colorscheme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
			const handleSystemThemeChange = () => {
				applyAppearanceSettings(settings.appearance)
			}
			mediaQuery.addEventListener("change", handleSystemThemeChange)
			return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
		}
	}, [vault, communityThemesLoaded, settings.appearance])

	// biome-ignore lint/correctness/useExhaustiveDependencies: persist when workspace state changes
	useEffect(() => {
		if (!vault) return
		persistWorkspace(vault.path)
	}, [panes, splitTree, activePaneId, vault, persistWorkspace])

	useEffect(() => {
		const suspensionInterval = setInterval(
			() => {
				suspendInactiveTabs()
			},
			5 * 60 * 1000,
		)

		return () => clearInterval(suspensionInterval)
	}, [suspendInactiveTabs])

	useEffect(() => {
		const preventDefaultDrag = (e: DragEvent) => {
			e.preventDefault()
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
		}
		document.addEventListener("dragover", preventDefaultDrag)
		document.addEventListener("drop", (e) => e.preventDefault())
		return () => {
			document.removeEventListener("dragover", preventDefaultDrag)
		}
	}, [])

	useEffect(() => {
		const unlisteners = [
			listen<string>("dock-open-vault", (event) => {
				const path = event.payload
				if (path && path !== vault?.path) {
					closeVault().then(() => openVault(path))
				}
			}),
			listen("menu-new-note", () => {
				if (vault) createFile(vault.path, "Untitled").then((filePath) => openTab(filePath))
			}),
			listen("menu-open-vault", async () => {
				const folderPath = await getPlatform().dialog.pickFolder()
				if (folderPath) {
					const existing = recentVaults.find((v) => v.path === folderPath)
					if (existing) {
						await closeVault()
						await openVault(folderPath)
					} else {
						await closeVault()
						await openVault(folderPath, { name: folderPath.split("/").pop() ?? folderPath })
					}
				}
			}),
			listen("menu-close-vault", () => {
				closeVault()
			}),
			listen<string>("menu-recent-vault", (event) => {
				const path = event.payload
				if (path && path !== vault?.path) {
					closeVault().then(() => openVault(path))
				}
			}),
		]

		return () => {
			for (const unlistener of unlisteners) {
				unlistener.then((fn) => fn())
			}
		}
	}, [vault, recentVaults, createFile, openTab, closeVault, openVault])

	const handleSidebarNavSelect = (id: string) => {
		if (id === "settings") {
			openSettings("general")
			return
		}
		if (id === leftSidebarView && !leftSidebarCollapsed) {
			toggleLeftSidebar()
			return
		}
		if (leftSidebarCollapsed) toggleLeftSidebar()
		setLeftSidebarView(id as Parameters<typeof setLeftSidebarView>[0])
	}

	const handleSidebarResizeStart = (e: React.MouseEvent) => {
		sidebarResizing.current = true
		sidebarResizeStart.current = { x: e.clientX, width: leftSidebarWidth }
		e.preventDefault()

		const handleMouseMove = (ev: MouseEvent) => {
			if (!sidebarResizing.current) return
			const delta = ev.clientX - sidebarResizeStart.current.x
			setLeftSidebarWidth(sidebarResizeStart.current.width + delta)
		}

		const handleMouseUp = () => {
			sidebarResizing.current = false
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)
	}

	return (
		<div className="flex flex-col h-screen bg-bg-primary text-text-primary">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: titlebar drag region requires mousedown on a presentational div */}
			<div
				className="h-10 pl-24 flex-shrink-0"
				onMouseDown={(e) => {
					if (e.button === 0) getCurrentWindow().startDragging()
				}}
			/>
			<div className="flex flex-1 overflow-hidden">
				{!vault ? (
					<EmptyVaultLayout />
				) : (
					<>
						<aside
							className="flex-shrink-0 bg-sidebar-bg border-r border-sidebar-border flex flex-col overflow-hidden min-w-[180px] max-w-[400px]"
							style={{ width: leftSidebarWidth }}
							aria-label="Sidebar panel"
						>
							<VaultSwitcher />
							<SidebarNav
								items={navItems}
								bottomItems={NAV_BOTTOM_ITEMS}
								activeId={leftSidebarView}
								onSelect={handleSidebarNavSelect}
							/>
							<div className="flex-1 overflow-hidden flex flex-col">
								{leftSidebarView === "files" && <FileSidebar />}
								{leftSidebarView === "search" && <SearchSidebar />}
								{leftSidebarView === "bookmarks" && <BookmarksSidebar />}
								{leftSidebarView === "tags" && <TagsSidebar />}
								{pluginViews
									.filter((v) => {
										const sidebarItem = pluginSidebarItems.find((s) => s.viewId === v.id)
										return sidebarItem && leftSidebarView === sidebarItem.id
									})
									.map((view) => (
										<PluginViewRenderer key={view.id} registration={view} />
									))}
							</div>
						</aside>
						<div
							className="w-[3px] flex-shrink-0 cursor-col-resize bg-transparent hover:bg-accent transition-colors duration-150"
							onMouseDown={handleSidebarResizeStart}
							aria-hidden="true"
						/>

						<main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-bg-primary">
							<SplitPaneView
								node={splitTree}
								renderLeaf={(paneId) => <PaneView key={paneId} paneId={paneId} />}
								onResize={resizeSplit}
							/>
						</main>
					</>
				)}
			</div>

			<StatusBar />

			<SettingsModal open={settingsOpen} onOpenChange={(open) => !open && closeSettings()} />
			<MarketplaceModal
				open={marketplaceOpen}
				initialTab={marketplaceInitialTab}
				onOpenChange={(open) => !open && closeMarketplace()}
			/>
			<QuickFinder />
			<CommandPalette />
			<TagPicker />
		</div>
	)
}
