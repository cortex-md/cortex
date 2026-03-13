import {
	noteCache,
	useAppStore,
	useBookmarksStore,
	useEditorStore,
	useTagsStore,
	useUIStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { useHotkey, useHotkeyListener, useHotkeysStore } from "@cortex/hotkeys"
import { getPlatform } from "@cortex/platform"
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
import { useCallback, useEffect, useRef, useState } from "react"
import { BookmarksSidebar } from "./features/bookmarks/BookmarksSidebar"
import { CommandPalette } from "./features/command-palette/CommandPalette"
import { registerCommand } from "./features/command-palette/commandRegistry"
import { FileSidebar } from "./features/file-explorer/FileSidebar"
import { type NavItem, SidebarNav } from "./features/file-explorer/SidebarNav"
import { EmptyVaultLayout } from "./features/layout/empty-vault-layout"
import { SplitPaneView } from "./features/layout/SplitPane"
import { QuickFinder } from "./features/quick-finder/QuickFinder"
import { SearchSidebar } from "./features/search/SearchSidebar"
import { applyAppearanceSettings } from "./features/settings/applyAppearance"
import { SettingsModal } from "./features/settings/SettingsModal"
import { PaneView } from "./features/split-view/PaneView"
import { StatusBar } from "./features/statusbar/StatusBar"
import { InitialSyncProgress } from "./features/sync/InitialSyncProgress"
import { TagPicker } from "./features/tags/TagPicker"
import { TagsSidebar } from "./features/tags/TagsSidebar"
import { VaultSwitcher } from "./features/vault/VaultSwitcher"

const NAV_ITEMS: NavItem[] = [
	{ id: "files", icon: FolderClosed, label: "Files" },
	{ id: "search", icon: SearchIcon, label: "Search" },
	{ id: "bookmarks", icon: BookmarkIcon, label: "Bookmarks" },
	{ id: "tags", icon: TagIcon, label: "Tags" },
]

const NAV_BOTTOM_ITEMS: NavItem[] = [{ id: "settings", icon: SettingsIcon, label: "Settings" }]

export default function App() {
	const [settingsOpen, setSettingsOpen] = useState(false)
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
	} = useUIStore()
	const { settings, loadSettings } = useSettingsStore()
	const loadOverrides = useHotkeysStore((s) => s.loadOverrides)
	const indexVault = useSearchStore((s) => s.indexVault)
	const resetSearch = useSearchStore((s) => s.reset)
	const buildTagIndex = useTagsStore((s) => s.buildIndex)
	const loadTagColors = useTagsStore((s) => s.loadTagColors)
	const loadBookmarks = useBookmarksStore((s) => s.loadBookmarks)
	const resetBookmarks = useBookmarksStore((s) => s.reset)

	const sidebarResizing = useRef(false)
	const sidebarResizeStart = useRef({ x: 0, width: 0 })
	const autoOpenAttempted = useRef(false)

	useHotkeyListener()

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
		useCallback(() => setSettingsOpen(true), []),
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
				label: "Toggle Theme",
				category: "View",
				icon: SunMoonIcon,
				execute: () => {
					const tm = getThemeManager()
					tm.setActiveTheme(tm.getActiveTheme().name === "ink" ? "paper" : "ink")
				},
			}),
			registerCommand({
				id: "app.settings",
				label: "Open Settings",
				category: "App",
				icon: SettingsIcon,
				execute: () => setSettingsOpen(true),
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
	])

	useEffect(() => {
		loadAppInfo()
		loadRecentVaults()
	}, [loadAppInfo, loadRecentVaults])

	useEffect(() => {
		if (autoOpenAttempted.current || vault) return
		if (recentVaults.length === 0) return
		if (!settings.general.autoOpenLastVault) return
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
		if (!vault) return
		applyAppearanceSettings(settings.appearance)

		if (settings.appearance.colorscheme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
			const handleSystemThemeChange = (e: MediaQueryListEvent) => {
				getThemeManager().setActiveTheme(e.matches ? "ink" : "paper")
			}
			mediaQuery.addEventListener("change", handleSystemThemeChange)
			return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
		}
	}, [vault, settings.appearance])

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
		const unlisteners = [
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
			setSettingsOpen(true)
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
								items={NAV_ITEMS}
								bottomItems={NAV_BOTTOM_ITEMS}
								activeId={leftSidebarView}
								onSelect={handleSidebarNavSelect}
							/>
							<div className="flex-1 overflow-hidden flex flex-col">
								{leftSidebarView === "files" && <FileSidebar />}
								{leftSidebarView === "search" && <SearchSidebar />}
								{leftSidebarView === "bookmarks" && <BookmarksSidebar />}
								{leftSidebarView === "tags" && <TagsSidebar />}
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

			<SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
			<QuickFinder />
			<CommandPalette />
			<TagPicker />
			<InitialSyncProgress />
		</div>
	)
}
