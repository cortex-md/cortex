import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export type DragSourceType = "tab" | "sidebar-view"

export interface TabDragSource {
	type: "tab"
	tabId: string
	sourcePaneId: string
}

export interface SidebarViewDragSource {
	type: "sidebar-view"
	viewId: string
	viewTitle: string
}

export type DragSource = TabDragSource | SidebarViewDragSource

export type DropZone = "center" | "left" | "right" | "top" | "bottom"

export interface DropTarget {
	paneId: string
	zone: DropZone
}

export interface DragState {
	dragSource: DragSource | null
	dropTarget: DropTarget | null

	startDrag: (source: DragSource) => void
	updateDropTarget: (target: DropTarget | null) => void
	completeDrop: () => Promise<void>
	cancelDrag: () => void
}

export const useDragStore = create<DragState>()(
	devtools(
		immer((set, get) => ({
			dragSource: null,
			dropTarget: null,

			startDrag: (source) => {
				set((s) => {
					s.dragSource = source
					s.dropTarget = null
				})
			},

			updateDropTarget: (target) => {
				set((s) => {
					s.dropTarget = target
				})
			},

			completeDrop: async () => {
				const { dragSource, dropTarget } = get()
				if (!dragSource || !dropTarget) {
					get().cancelDrag()
					return
				}

				const source = structuredClone(dragSource) as DragSource
				const target = structuredClone(dropTarget) as DropTarget

				set((s) => {
					s.dragSource = null
					s.dropTarget = null
				})

				const { useWorkspaceStore } = await import("./workspaceStore")
				const workspace = useWorkspaceStore.getState()

				if (source.type === "tab") {
					const { tabId, sourcePaneId } = source
					const { paneId: targetPaneId, zone } = target

					if (zone === "center") {
						workspace.moveTab(tabId, sourcePaneId, targetPaneId)
					} else {
						const direction: "horizontal" | "vertical" =
							zone === "left" || zone === "right" ? "horizontal" : "vertical"
						const position: "before" | "after" =
							zone === "left" || zone === "top" ? "before" : "after"
						workspace.moveTabToNewSplit(tabId, sourcePaneId, targetPaneId, direction, position)
					}
				} else if (source.type === "sidebar-view") {
					const { viewId, viewTitle } = source
					const { paneId: targetPaneId, zone } = target

					if (zone === "center") {
						workspace.openViewTab(viewId, viewTitle, { paneId: targetPaneId })
					} else {
						const direction: "horizontal" | "vertical" =
							zone === "left" || zone === "right" ? "horizontal" : "vertical"
						const position: "before" | "after" =
							zone === "left" || zone === "top" ? "before" : "after"
						workspace.openViewTab(viewId, viewTitle, {
							paneId: targetPaneId,
							split: direction,
							splitPosition: position,
						})
					}
				}
			},

			cancelDrag: () => {
				set((s) => {
					s.dragSource = null
					s.dropTarget = null
				})
			},
		})),
		{ name: "dragStore" },
	),
)
