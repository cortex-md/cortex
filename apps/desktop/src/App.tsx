import {
	noteCache,
	useEditorStore,
	useUIStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { useSettingsStore } from "@cortex/settings"
import type { NavItem } from "@cortex/ui"
import { SidebarNav, SplitPaneView, StatusBar } from "@cortex/ui"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { BookmarkIcon, FolderClosed, SearchIcon, SettingsIcon, TagIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { FileSidebar } from "./components/FileSidebar"
import { PaneView } from "./components/PaneView"
import { SettingsModal } from "./components/SettingsModal"
import { EmptyVaultLayout } from "./features/layout/empty-vault-layout"

const NAV_ITEMS: NavItem[] = [
	{ id: "files", icon: FolderClosed, label: "Files" },
	{ id: "search", icon: SearchIcon, label: "Search" },
	{ id: "bookmarks", icon: BookmarkIcon, label: "Bookmarks" },
	{ id: "tags", icon: TagIcon, label: "Tags" },
]

const NAV_BOTTOM_ITEMS: NavItem[] = [{ id: "settings", icon: SettingsIcon, label: "Settings" }]

export default function App() {
	const [settingsOpen, setSettingsOpen] = useState(false)
	const { vault } = useVaultStore()
	const { cursor, mode, setMode, flushActive } = useEditorStore()
	const { activeFilePath } = useEditorStore()
	const {
		splitTree,
		resizeSplit,
		closeTab,
		goToTabIndex,
		navigateMRU,
		reopenLastClosed,
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
	} = useUIStore()
	const { loadSettings } = useSettingsStore()

	const sidebarResizing = useRef(false)
	const sidebarResizeStart = useRef({ x: 0, width: 0 })

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
			return
		}
		loadWorkspace(vault.path)
		loadSettings(vault.path)
	}, [vault, loadWorkspace, reset, loadSettings])

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
		const handleKeyDown = (e: KeyboardEvent) => {
			const mod = e.metaKey || e.ctrlKey

			if (mod && e.key === "w") {
				e.preventDefault()
				const pane = panes[activePaneId]
				const activeTabId = pane?.activeTabId
				if (activeTabId) closeTab(activeTabId, activePaneId)
				return
			}

			if (mod && e.shiftKey && e.key === "t") {
				e.preventDefault()
				reopenLastClosed()
				return
			}

			if (mod && e.key === "Tab") {
				e.preventDefault()
				navigateMRU(e.shiftKey ? -1 : 1)
				return
			}

			if (mod && e.key === "[") {
				e.preventDefault()
				toggleLeftSidebar()
				return
			}

			if (mod && /^[1-9]$/.test(e.key)) {
				e.preventDefault()
				goToTabIndex(Number.parseInt(e.key, 10) - 1)
			}
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [
		panes,
		activePaneId,
		closeTab,
		reopenLastClosed,
		navigateMRU,
		toggleLeftSidebar,
		goToTabIndex,
	])

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
		<div className="app">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: titlebar drag region requires mousedown on a presentational div */}
			<div
				className="titlebar"
				onMouseDown={(e) => {
					if (e.button === 0) getCurrentWindow().startDragging()
				}}
			/>
			<div className="app-body">
				{!vault ? (
					<EmptyVaultLayout />
				) : (
					<>
						<aside
							className="app-sidebar"
							style={{ width: leftSidebarWidth }}
							aria-label="Sidebar panel"
						>
							<SidebarNav
								items={NAV_ITEMS}
								bottomItems={NAV_BOTTOM_ITEMS}
								activeId={leftSidebarView}
								onSelect={handleSidebarNavSelect}
							/>
							<div className="sidebar-content">
								{leftSidebarView === "files" && <FileSidebar />}
								{leftSidebarView === "search" && (
									<div className="sidebar-placeholder">
										<span>Search — coming soon</span>
									</div>
								)}
								{leftSidebarView === "bookmarks" && (
									<div className="sidebar-placeholder">
										<span>Bookmarks — coming soon</span>
									</div>
								)}
								{leftSidebarView === "tags" && (
									<div className="sidebar-placeholder">
										<span>Tags — coming soon</span>
									</div>
								)}
							</div>
						</aside>
						<div
							className="sidebar-resizer"
							onMouseDown={handleSidebarResizeStart}
							aria-hidden="true"
						/>

						<main className="app-editor-area">
							<SplitPaneView
								node={splitTree}
								renderLeaf={(paneId) => <PaneView key={paneId} paneId={paneId} />}
								onResize={resizeSplit}
							/>
						</main>
					</>
				)}
			</div>

			<StatusBar filePath={activeFilePath} cursor={cursor} mode={mode} onModeChange={setMode} />

			{settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
		</div>
	)
}
