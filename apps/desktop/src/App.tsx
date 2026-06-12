import {
	LEFT_SIDEBAR_WIDTH_BOUNDS,
	noteCache,
	useAppStore,
	useAuthStore,
	useBookmarksStore,
	useDragStore,
	useEditorStore,
	useTagsStore,
	useUIStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { useHotkeyListener, useHotkeysStore } from "@cortex/hotkeys"
import { getPlatform } from "@cortex/platform"
import { PluginViewRenderer, usePluginStore } from "@cortex/plugin-runtime"
import { useSearchStore } from "@cortex/search"
import { useSettingsStore } from "@cortex/settings"
import { Button } from "@cortex/ui"
import { listen } from "@tauri-apps/api/event"
import { getCurrentWindow } from "@tauri-apps/api/window"
import {
	BookmarkIcon,
	FolderClosed,
	PanelLeftIcon,
	SearchIcon,
	SettingsIcon,
	TagIcon,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { initializePluginBridges } from "./bootstrap/pluginBridges"
import { AuthModal } from "./features/auth/AuthModal"
import { BookmarksSidebar } from "./features/bookmarks/BookmarksSidebar"
import { CommandPalette } from "./features/command-palette/CommandPalette"
import { FileSidebar } from "./features/file-explorer/FileSidebar"
import { type NavItem, SidebarNav } from "./features/file-explorer/SidebarNav"
import { EmptyVaultLayout } from "./features/layout/empty-vault-layout"
import { SplitPaneView } from "./features/layout/SplitPane"
import { QuickFinder } from "./features/quick-finder/QuickFinder"
import { SearchSidebar } from "./features/search/SearchSidebar"
import { SettingsModal } from "./features/settings/SettingsModal"
import { DragPreview } from "./features/split-view/DragPreview"
import { PaneView } from "./features/split-view/PaneView"
import { StatusBar } from "./features/statusbar/StatusBar"
import { TagPicker } from "./features/tags/TagPicker"
import { TagsSidebar } from "./features/tags/TagsSidebar"
import { VaultSwitcher } from "./features/vault/VaultSwitcher"
import { useAppCommands } from "./hooks/useAppCommands"
import { useCommunityPluginLifecycle } from "./hooks/useCommunityPluginLifecycle"
import { useCommunityThemeLifecycle } from "./hooks/useCommunityThemeLifecycle"
import { useNativeMenuEvents } from "./hooks/useNativeMenuEvents"
import { useNativeNotifications } from "./hooks/useNativeNotifications"
import { useSidebarResize } from "./hooks/useSidebarResize"
import { useSyncLifecycle } from "./hooks/useSyncLifecycle"
import { useWorkspacePersistence } from "./hooks/useWorkspacePersistence"

initializePluginBridges()

const CORE_NAV_ITEMS: NavItem[] = [
	{ id: "files", icon: FolderClosed, label: "Files" },
	{ id: "search", icon: SearchIcon, label: "Search" },
	{ id: "bookmarks", icon: BookmarkIcon, label: "Bookmarks" },
	{ id: "tags", icon: TagIcon, label: "Tags" },
]

const NAV_BOTTOM_ITEMS: NavItem[] = [
	{ id: "settings", icon: SettingsIcon, label: "Settings", draggable: false },
]

export default function App() {
	const { vault, files, recentVaults, openVault, loadRecentVaults } = useVaultStore()
	const { loadAppInfo } = useAppStore()
	const { flushActive } = useEditorStore()
	const { splitTree, resizeSplit, loadWorkspace, persistWorkspace, reset, suspendInactiveTabs } =
		useWorkspaceStore()
	const leftSidebarCollapsed = useUIStore((s) => s.leftSidebarCollapsed)
	const leftSidebarWidth = useUIStore((s) => s.leftSidebarWidth)
	const leftSidebarView = useUIStore((s) => s.leftSidebarView)
	const setLeftSidebarWidth = useUIStore((s) => s.setLeftSidebarWidth)
	const setLeftSidebarView = useUIStore((s) => s.setLeftSidebarView)
	const toggleLeftSidebar = useUIStore((s) => s.toggleLeftSidebar)
	const settingsOpen = useUIStore((s) => s.settingsOpen)
	const settingsInitialSection = useUIStore((s) => s.settingsInitialSection)
	const marketplaceInitialTab = useUIStore((s) => s.marketplaceInitialTab)
	const openSettings = useUIStore((s) => s.openSettings)
	const closeSettings = useUIStore((s) => s.closeSettings)
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
	const [settingsModalOpen, setSettingsModalOpen] = useState(false)
	const [workspacePersistenceVaultPath, setWorkspacePersistenceVaultPath] = useState<string | null>(
		null,
	)

	const navItems = useMemo<NavItem[]>(() => {
		const pluginNavItems: NavItem[] = pluginSidebarItems.map((item) => ({
			id: item.id,
			viewId: item.viewId,
			icon: item.icon,
			label: item.label,
		}))
		return [...CORE_NAV_ITEMS, ...pluginNavItems]
	}, [pluginSidebarItems])

	const autoOpenAttempted = useRef(false)
	const { sidebarElementRef, handleSidebarResizeStart } = useSidebarResize(
		leftSidebarCollapsed,
		leftSidebarWidth,
		setLeftSidebarWidth,
	)

	useHotkeyListener()
	useSyncLifecycle()
	useNativeNotifications()
	useCommunityPluginLifecycle(vault)
	useCommunityThemeLifecycle(vault, settings.appearance)
	useNativeMenuEvents()
	useWorkspacePersistence(vault?.path ?? null, workspacePersistenceVaultPath, persistWorkspace)
	useAppCommands()

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
			setWorkspacePersistenceVaultPath(null)
			reset()
			resetSearch()
			resetBookmarks()
			return
		}
		setWorkspacePersistenceVaultPath(null)
		let cancelled = false
		const vaultPath = vault.path
		loadWorkspace(vaultPath).finally(() => {
			if (!cancelled) setWorkspacePersistenceVaultPath(vaultPath)
		})
		loadSettings(vault.path)
		loadOverrides(vault.path)
		loadBookmarks(vault.path)
		loadTagColors(vault.path)
		return () => {
			cancelled = true
		}
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
		if (!settingsOpen) {
			setSettingsModalOpen(false)
			return
		}

		if (!vault) {
			setSettingsModalOpen(true)
			return
		}

		getPlatform()
			.window.openSettings({
				section: settingsInitialSection,
				marketplaceTab: marketplaceInitialTab,
				vaultPath: vault.path,
				vaultName: vault.name,
			})
			.then(() => closeSettings())
			.catch(() => setSettingsModalOpen(true))
	}, [settingsOpen, settingsInitialSection, marketplaceInitialTab, vault, closeSettings])

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
			if (!useDragStore.getState().dragSource) return
			e.preventDefault()
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move"
		}
		const preventDefaultDrop = (e: DragEvent) => {
			if (!useDragStore.getState().dragSource) return
			e.preventDefault()
			useDragStore.getState().cancelDrag()
		}
		document.addEventListener("dragover", preventDefaultDrag)
		document.addEventListener("drop", preventDefaultDrop)
		return () => {
			document.removeEventListener("dragover", preventDefaultDrag)
			document.removeEventListener("drop", preventDefaultDrop)
		}
	}, [])

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

	return (
		<div className="app-shell flex flex-col h-screen bg-bg-primary text-text-primary">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: titlebar drag region requires mousedown on a presentational div */}
			<div
				className="app-titlebar h-10 pl-24 flex-shrink-0"
				onMouseDown={(e) => {
					if (e.button === 0) getCurrentWindow().startDragging()
				}}
			>
				{vault && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className={`app-sidebar-toggle ${
							leftSidebarCollapsed ? "app-sidebar-toggle--collapsed" : ""
						}`}
						aria-label={leftSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
						aria-pressed={!leftSidebarCollapsed}
						title={leftSidebarCollapsed ? "Show Sidebar" : "Hide Sidebar"}
						onMouseDown={(event) => event.stopPropagation()}
						onClick={toggleLeftSidebar}
					>
						<PanelLeftIcon size={24} strokeWidth={2} />
					</Button>
				)}
			</div>
			<div className="app-content flex flex-1 overflow-hidden">
				{!vault ? (
					<EmptyVaultLayout />
				) : (
					<>
						<aside
							ref={sidebarElementRef}
							className={`app-sidebar flex-shrink-0 bg-sidebar-bg border-r border-sidebar-border flex flex-col overflow-hidden ${
								leftSidebarCollapsed ? "app-sidebar--collapsed" : ""
							}`}
							style={{
								width: leftSidebarCollapsed ? 0 : leftSidebarWidth,
								minWidth: leftSidebarCollapsed ? 0 : LEFT_SIDEBAR_WIDTH_BOUNDS.min,
								maxWidth: leftSidebarCollapsed ? 0 : LEFT_SIDEBAR_WIDTH_BOUNDS.max,
							}}
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
							className={`app-sidebar-resizer w-[3px] flex-shrink-0 cursor-col-resize bg-transparent hover:bg-accent transition-colors duration-150 ${
								leftSidebarCollapsed ? "app-sidebar-resizer--hidden" : ""
							}`}
							onMouseDown={handleSidebarResizeStart}
							aria-hidden="true"
						/>

						<main className="app-main flex-1 overflow-hidden flex flex-col min-w-0 bg-bg-primary">
							<div className="flex-1 min-h-0 overflow-hidden">
								<SplitPaneView
									node={splitTree}
									renderLeaf={(paneId) => <PaneView key={paneId} paneId={paneId} />}
									onResize={resizeSplit}
								/>
							</div>
							<StatusBar />
						</main>
					</>
				)}
			</div>

			<SettingsModal open={settingsModalOpen} onOpenChange={(open) => !open && closeSettings()} />
			<AuthModal />
			<QuickFinder />
			<CommandPalette />
			<TagPicker />
			<DragPreview />
		</div>
	)
}
