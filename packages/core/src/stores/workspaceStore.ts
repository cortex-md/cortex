import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"
import { noteCache } from "../noteCache"
import { type LeftSidebarLayout, useUIStore } from "./uiStore"

export type SplitDirection = "horizontal" | "vertical"
export type TabType = "file" | "view"
export type ViewTabState = Record<string, unknown>

export interface Tab {
	id: string
	tabType: TabType
	filePath: string
	viewId: string | null
	viewState: ViewTabState | null
	title: string
	isPinned: boolean
	isDirty: boolean
	lastAccessed: number
	isSuspended: boolean
}

export interface LeafNode {
	type: "leaf"
	id: string
}

export interface SplitNode {
	type: "split"
	id: string
	direction: SplitDirection
	children: SplitTree[]
	sizes: number[]
}

export type SplitTree = LeafNode | SplitNode

export interface Pane {
	id: string
	tabs: Tab[]
	activeTabId: string | null
}

interface RecentlyClosed {
	filePath: string
	title: string
}

interface WorkspaceSnapshot {
	panes: Record<string, Pane>
	splitTree: SplitTree
	activePaneId: string
	leftSidebar?: Partial<LeftSidebarLayout>
}

export interface OpenTabOptions {
	paneId?: string
	split?: SplitDirection
	splitPosition?: "before" | "after"
	forceNew?: boolean
	newTab?: boolean
	insertIndex?: number
	viewState?: ViewTabState
}

export interface WorkspaceState {
	panes: Record<string, Pane>
	splitTree: SplitTree
	activePaneId: string
	mruOrder: string[]
	recentlyClosed: RecentlyClosed[]

	openTab: (filePath: string, opts?: OpenTabOptions) => void
	openViewTab: (viewId: string, title: string, opts?: OpenTabOptions) => void
	openInSplit: (filePath: string, paneId: string, direction: SplitDirection) => void
	closeTab: (tabId: string, paneId: string) => void
	closeTabsByPath: (filePath: string) => void
	updateTabPath: (oldPath: string, newPath: string) => void
	activateTab: (tabId: string, paneId: string) => void
	pinTab: (tabId: string, paneId: string) => void
	markTabDirty: (tabId: string, dirty: boolean) => void
	updateViewTabState: (tabId: string, paneId: string, viewState: ViewTabState) => void
	splitPane: (paneId: string, direction: SplitDirection, position?: "before" | "after") => void
	closePane: (paneId: string) => void
	resizeSplit: (nodeId: string, sizes: number[]) => void
	moveTab: (tabId: string, fromPaneId: string, toPaneId: string, insertIndex?: number) => void
	moveTabToNewSplit: (
		tabId: string,
		fromPaneId: string,
		targetPaneId: string,
		direction: SplitDirection,
		position: "before" | "after",
	) => void
	goToTabIndex: (index: number) => void
	navigateMRU: (delta: 1 | -1) => void
	reopenLastClosed: () => void
	suspendInactiveTabs: () => void
	persistWorkspace: (vaultPath: string) => Promise<void>
	loadWorkspace: (vaultPath: string) => Promise<void>
	reset: () => void
}

const ROOT_PANE_ID = "root"
const MAX_RECENT_CLOSED = 10
const SUSPENSION_IDLE_MS = 30 * 60 * 1000

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

function replaceInTree(tree: SplitTree, targetId: string, replacement: SplitTree): SplitTree {
	if (tree.id === targetId) return replacement
	if (tree.type === "leaf") return tree
	return { ...tree, children: tree.children.map((c) => replaceInTree(c, targetId, replacement)) }
}

function removeFromTree(tree: SplitTree, targetId: string): SplitTree | null {
	if (tree.id === targetId) return null
	if (tree.type === "leaf") return tree
	const newChildren = tree.children
		.map((c) => removeFromTree(c, targetId))
		.filter((c): c is SplitTree => c !== null)
	if (newChildren.length === 0) return null
	if (newChildren.length === 1) return newChildren[0]
	return {
		...tree,
		children: newChildren,
		sizes: newChildren.map(() => 100 / newChildren.length),
	}
}

function findTabInPanes(
	panes: Record<string, Pane>,
	filePath: string,
): { tabId: string; paneId: string } | null {
	for (const [paneId, pane] of Object.entries(panes)) {
		const tab = pane.tabs.find((t) => t.tabType === "file" && t.filePath === filePath)
		if (tab) return { tabId: tab.id, paneId }
	}
	return null
}

function findViewTabInPanes(
	panes: Record<string, Pane>,
	viewId: string,
): { tabId: string; paneId: string } | null {
	for (const [paneId, pane] of Object.entries(panes)) {
		const tab = pane.tabs.find((t) => t.tabType === "view" && t.viewId === viewId)
		if (tab) return { tabId: tab.id, paneId }
	}
	return null
}

function findTabPane(panes: Record<string, Pane>, tabId: string): string | null {
	for (const [paneId, pane] of Object.entries(panes)) {
		if (pane.tabs.some((t) => t.id === tabId)) return paneId
	}
	return null
}

const buildInitialState = () => ({
	panes: {
		[ROOT_PANE_ID]: { id: ROOT_PANE_ID, tabs: [], activeTabId: null },
	} as Record<string, Pane>,
	splitTree: { type: "leaf", id: ROOT_PANE_ID } as SplitTree,
	activePaneId: ROOT_PANE_ID,
	mruOrder: [] as string[],
	recentlyClosed: [] as RecentlyClosed[],
})

function insertTabAt(pane: Pane, tab: Tab, insertIndex?: number): void {
	const index = insertIndex === undefined ? pane.tabs.length : Math.max(0, insertIndex)
	pane.tabs.splice(Math.min(index, pane.tabs.length), 0, tab)
}

export const useWorkspaceStore = create<WorkspaceState>()(
	devtools(
		immer((set, get) => ({
			...buildInitialState(),

			openTab: (filePath, opts) => {
				const { panes, activePaneId } = get()

				const shouldForceNewTab = opts?.forceNew ?? opts?.newTab ?? false
				const existing = shouldForceNewTab ? null : findTabInPanes(panes, filePath)
				if (existing) {
					get().activateTab(existing.tabId, existing.paneId)
					return
				}

				let targetPaneId = opts?.paneId ?? activePaneId

				if (opts?.split) {
					get().splitPane(targetPaneId, opts.split, opts.splitPosition)
					targetPaneId = get().activePaneId
				}

				const tabId = crypto.randomUUID()
				const tab: Tab = {
					id: tabId,
					tabType: "file",
					filePath,
					viewId: null,
					viewState: null,
					title: titleFromPath(filePath),
					isPinned: false,
					isDirty: false,
					lastAccessed: Date.now(),
					isSuspended: false,
				}

				noteCache.openTab(filePath)

				set((s) => {
					const pane = s.panes[targetPaneId]
					if (!pane) return
					insertTabAt(pane, tab, opts?.insertIndex)
					pane.activeTabId = tabId
					s.activePaneId = targetPaneId
					s.mruOrder = [tabId, ...s.mruOrder.filter((id) => id !== tabId)]
				})
			},

			openViewTab: (viewId, title, opts) => {
				const { panes, activePaneId } = get()

				const shouldForceNewTab = opts?.forceNew ?? opts?.newTab ?? false
				const existing = shouldForceNewTab ? null : findViewTabInPanes(panes, viewId)
				if (existing) {
					get().activateTab(existing.tabId, existing.paneId)
					return
				}

				let targetPaneId = opts?.paneId ?? activePaneId

				if (opts?.split) {
					get().splitPane(targetPaneId, opts.split, opts.splitPosition)
					targetPaneId = get().activePaneId
				}

				const tabId = crypto.randomUUID()
				const tab: Tab = {
					id: tabId,
					tabType: "view",
					filePath: "",
					viewId,
					viewState: opts?.viewState ?? null,
					title,
					isPinned: false,
					isDirty: false,
					lastAccessed: Date.now(),
					isSuspended: false,
				}

				set((s) => {
					const pane = s.panes[targetPaneId]
					if (!pane) return
					insertTabAt(pane, tab, opts?.insertIndex)
					pane.activeTabId = tabId
					s.activePaneId = targetPaneId
					s.mruOrder = [tabId, ...s.mruOrder.filter((id) => id !== tabId)]
				})
			},

			openInSplit: (filePath, paneId, direction) => {
				get().splitPane(paneId, direction)
				const newPaneId = get().activePaneId

				const tabId = crypto.randomUUID()
				const tab: Tab = {
					id: tabId,
					tabType: "file",
					filePath,
					viewId: null,
					viewState: null,
					title: titleFromPath(filePath),
					isPinned: false,
					isDirty: false,
					lastAccessed: Date.now(),
					isSuspended: false,
				}

				noteCache.openTab(filePath)

				set((s) => {
					const pane = s.panes[newPaneId]
					if (!pane) return
					pane.tabs.push(tab)
					pane.activeTabId = tabId
					s.mruOrder = [tabId, ...s.mruOrder.filter((id) => id !== tabId)]
				})
			},

			closeTab: (tabId, paneId) => {
				const { panes, mruOrder, recentlyClosed } = get()
				const pane = panes[paneId]
				if (!pane) return
				const tab = pane.tabs.find((t) => t.id === tabId)
				if (!tab || tab.isPinned) return

				const tabIndex = pane.tabs.indexOf(tab)
				const remainingTabs = pane.tabs.filter((t) => t.id !== tabId)

				let nextTabId: string | null = null
				if (pane.activeTabId === tabId) {
					const paneMruTabs = mruOrder.filter(
						(id) => id !== tabId && remainingTabs.some((t) => t.id === id),
					)
					nextTabId =
						paneMruTabs[0] ??
						remainingTabs[Math.min(tabIndex, remainingTabs.length - 1)]?.id ??
						null
				}

				if (tab.tabType === "file" && tab.filePath) {
					const openInOtherTabs = Object.values(panes).some((p) =>
						p.tabs.some(
							(t) => t.id !== tabId && t.tabType === "file" && t.filePath === tab.filePath,
						),
					)

					if (!openInOtherTabs) {
						noteCache.closeTab(tab.filePath)
					}
				}

				set((s) => {
					const p = s.panes[paneId]
					if (!p) return
					p.tabs = p.tabs.filter((t) => t.id !== tabId)
					p.activeTabId = nextTabId
					s.mruOrder = mruOrder.filter((id) => id !== tabId)
					if (tab.tabType === "file" && tab.filePath) {
						s.recentlyClosed = [
							{ filePath: tab.filePath, title: tab.title },
							...recentlyClosed.slice(0, MAX_RECENT_CLOSED - 1),
						]
					}
				})

				if (remainingTabs.length === 0 && Object.keys(get().panes).length > 1) {
					get().closePane(paneId)
				}
			},

			closeTabsByPath: (filePath) => {
				const { panes } = get()
				for (const [paneId, pane] of Object.entries(panes)) {
					const matchingTabs = pane.tabs.filter((t) => t.filePath === filePath)
					for (const tab of matchingTabs) {
						get().closeTab(tab.id, paneId)
					}
				}
			},

			updateTabPath: (oldPath, newPath) => {
				set((s) => {
					const newTitle = titleFromPath(newPath)
					for (const pane of Object.values(s.panes)) {
						for (const tab of pane.tabs) {
							if (tab.filePath === oldPath) {
								tab.filePath = newPath
								tab.title = newTitle
							}
						}
					}
				})
			},

			activateTab: (tabId, paneId) => {
				set((s) => {
					const pane = s.panes[paneId]
					if (!pane) return
					const tab = pane.tabs.find((t) => t.id === tabId)
					if (!tab) return
					pane.activeTabId = tabId
					tab.lastAccessed = Date.now()
					tab.isSuspended = false
					s.activePaneId = paneId
					s.mruOrder = [tabId, ...s.mruOrder.filter((id) => id !== tabId)]
				})
			},

			pinTab: (tabId, paneId) => {
				set((s) => {
					const tab = s.panes[paneId]?.tabs.find((t) => t.id === tabId)
					if (tab) tab.isPinned = !tab.isPinned
				})
			},

			markTabDirty: (tabId, dirty) => {
				set((s) => {
					for (const pane of Object.values(s.panes)) {
						const tab = pane.tabs.find((t) => t.id === tabId)
						if (tab) {
							tab.isDirty = dirty
							return
						}
					}
				})
			},

			updateViewTabState: (tabId, paneId, viewState) => {
				set((s) => {
					const tab = s.panes[paneId]?.tabs.find((t) => t.id === tabId)
					if (tab?.tabType === "view") tab.viewState = viewState
				})
			},

			splitPane: (paneId, direction, position) => {
				const newPaneId = crypto.randomUUID()
				const splitNodeId = crypto.randomUUID()

				const children: SplitTree[] =
					position === "before"
						? [
								{ type: "leaf", id: newPaneId },
								{ type: "leaf", id: paneId },
							]
						: [
								{ type: "leaf", id: paneId },
								{ type: "leaf", id: newPaneId },
							]

				set((s) => {
					s.panes[newPaneId] = { id: newPaneId, tabs: [], activeTabId: null }
					s.splitTree = replaceInTree(s.splitTree, paneId, {
						type: "split",
						id: splitNodeId,
						direction,
						children,
						sizes: [50, 50],
					})
					s.activePaneId = newPaneId
				})
			},

			closePane: (paneId) => {
				const { panes, splitTree, activePaneId, mruOrder } = get()
				if (Object.keys(panes).length <= 1) return

				const pane = panes[paneId]
				if (!pane) return

				const otherPaneId = Object.keys(panes).find((id) => id !== paneId)

				for (const tab of pane.tabs) {
					if (tab.tabType !== "file" || !tab.filePath) continue
					const openInOtherPanes = Object.entries(panes)
						.filter(([id]) => id !== paneId)
						.some(([, p]) => p.tabs.some((t) => t.filePath === tab.filePath))
					if (!openInOtherPanes) noteCache.closeTab(tab.filePath)
				}

				const newTree = removeFromTree(splitTree, paneId) ?? {
					type: "leaf" as const,
					id: otherPaneId ?? ROOT_PANE_ID,
				}

				const closedTabIds = new Set(pane.tabs.map((t) => t.id))

				set((s) => {
					delete s.panes[paneId]
					s.splitTree = newTree
					if (activePaneId === paneId) {
						s.activePaneId = otherPaneId ?? ROOT_PANE_ID
					}
					s.mruOrder = mruOrder.filter((id) => !closedTabIds.has(id))
				})
			},

			resizeSplit: (nodeId, sizes) => {
				const updateSizes = (tree: SplitTree): SplitTree => {
					if (tree.type === "leaf") return tree
					if (tree.id === nodeId) return { ...tree, sizes }
					return { ...tree, children: tree.children.map(updateSizes) }
				}
				set((s) => {
					s.splitTree = updateSizes(s.splitTree)
				})
			},

			moveTab: (tabId, fromPaneId, toPaneId, insertIndex) => {
				const { panes } = get()
				const fromPane = panes[fromPaneId]
				if (!fromPane) return
				const sourceIndex = fromPane.tabs.findIndex((t) => t.id === tabId)
				const tab = fromPane.tabs[sourceIndex]
				if (!tab) return

				const tabCopy = { ...tab, lastAccessed: Date.now() }
				const targetIndex =
					fromPaneId === toPaneId && insertIndex !== undefined && sourceIndex < insertIndex
						? insertIndex - 1
						: insertIndex

				set((s) => {
					const from = s.panes[fromPaneId]
					const to = s.panes[toPaneId]
					if (!from || !to) return
					from.tabs = from.tabs.filter((t) => t.id !== tabId)
					if (from.activeTabId === tabId) {
						from.activeTabId = from.tabs[from.tabs.length - 1]?.id ?? null
					}
					insertTabAt(to, tabCopy, targetIndex)
					to.activeTabId = tabId
					s.activePaneId = toPaneId
				})

				const updatedFromPane = get().panes[fromPaneId]
				if (updatedFromPane && updatedFromPane.tabs.length === 0) {
					if (Object.keys(get().panes).length > 1) {
						get().closePane(fromPaneId)
					}
				}
			},

			moveTabToNewSplit: (tabId, fromPaneId, targetPaneId, direction, position) => {
				const { panes } = get()
				const fromPane = panes[fromPaneId]
				if (!fromPane) return
				const tab = fromPane.tabs.find((t) => t.id === tabId)
				if (!tab) return

				const newPaneId = crypto.randomUUID()
				const splitNodeId = crypto.randomUUID()
				const tabCopy = { ...tab, lastAccessed: Date.now() }

				set((s) => {
					const from = s.panes[fromPaneId]
					if (!from) return
					from.tabs = from.tabs.filter((t) => t.id !== tabId)
					if (from.activeTabId === tabId) {
						from.activeTabId = from.tabs[from.tabs.length - 1]?.id ?? null
					}

					s.panes[newPaneId] = {
						id: newPaneId,
						tabs: [tabCopy],
						activeTabId: tabId,
					}

					const children: SplitTree[] =
						position === "before"
							? [
									{ type: "leaf", id: newPaneId },
									{ type: "leaf", id: targetPaneId },
								]
							: [
									{ type: "leaf", id: targetPaneId },
									{ type: "leaf", id: newPaneId },
								]

					s.splitTree = replaceInTree(s.splitTree, targetPaneId, {
						type: "split",
						id: splitNodeId,
						direction,
						children,
						sizes: [50, 50],
					})
					s.activePaneId = newPaneId
				})

				const updatedFromPane = get().panes[fromPaneId]
				if (fromPaneId !== targetPaneId && updatedFromPane && updatedFromPane.tabs.length === 0) {
					if (Object.keys(get().panes).length > 1) {
						get().closePane(fromPaneId)
					}
				}
			},

			goToTabIndex: (index) => {
				const { panes, activePaneId } = get()
				const pane = panes[activePaneId]
				if (!pane) return
				const tab = pane.tabs[index]
				if (tab) get().activateTab(tab.id, activePaneId)
			},

			navigateMRU: (delta) => {
				const { mruOrder, panes, activePaneId } = get()
				if (mruOrder.length === 0) return
				const pane = panes[activePaneId]
				if (!pane?.activeTabId) return
				const currentIdx = mruOrder.indexOf(pane.activeTabId)
				const nextIdx = (currentIdx + delta + mruOrder.length) % mruOrder.length
				const nextTabId = mruOrder[nextIdx]
				const nextPaneId = findTabPane(panes, nextTabId)
				if (nextTabId && nextPaneId) get().activateTab(nextTabId, nextPaneId)
			},

			reopenLastClosed: () => {
				const { recentlyClosed } = get()
				if (recentlyClosed.length === 0) return
				const last = recentlyClosed[0]
				set((s) => {
					s.recentlyClosed = s.recentlyClosed.slice(1)
				})
				get().openTab(last.filePath)
			},

			suspendInactiveTabs: () => {
				const now = Date.now()
				set((s) => {
					for (const pane of Object.values(s.panes)) {
						for (const tab of pane.tabs) {
							if (tab.id !== pane.activeTabId && !tab.isSuspended) {
								if (now - tab.lastAccessed > SUSPENSION_IDLE_MS) {
									tab.isSuspended = true
								}
							}
						}
					}
				})
			},

			persistWorkspace: async (vaultPath) => {
				const { panes, splitTree, activePaneId } = get()
				const { leftSidebarCollapsed, leftSidebarWidth } = useUIStore.getState()
				const platform = getPlatform()
				const configPath = `${vaultPath}/.cortex/workspace.json`
				await platform.fs.writeFile(
					configPath,
					JSON.stringify(
						{
							panes,
							splitTree,
							activePaneId,
							leftSidebar: {
								collapsed: leftSidebarCollapsed,
								width: leftSidebarWidth,
							},
						},
						null,
						2,
					),
				)
			},

			loadWorkspace: async (vaultPath) => {
				const platform = getPlatform()
				const configPath = `${vaultPath}/.cortex/workspace.json`
				try {
					const raw = await platform.fs.readFile(configPath)
					const data = JSON.parse(raw) as WorkspaceSnapshot
					if (data.panes && data.splitTree) {
						for (const pane of Object.values(data.panes)) {
							for (const tab of pane.tabs) {
								if (!tab.tabType) tab.tabType = "file"
								if (tab.viewId === undefined) tab.viewId = null
								if (tab.viewState === undefined) tab.viewState = null
							}
						}
						set((s) => {
							s.panes = data.panes
							s.splitTree = data.splitTree
							s.activePaneId = data.activePaneId ?? ROOT_PANE_ID
						})
					}
					if (data.leftSidebar) {
						useUIStore.getState().setLeftSidebarLayout(data.leftSidebar)
					} else {
						useUIStore.getState().resetLeftSidebarLayout()
					}
				} catch {
					useUIStore.getState().resetLeftSidebarLayout()
				}
			},

			reset: () => {
				set((s) => {
					Object.assign(s, buildInitialState())
				})
			},
		})),
		{ name: "workspaceStore" },
	),
)
