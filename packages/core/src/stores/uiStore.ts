import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export type LeftSidebarView = "files" | "search" | "bookmarks" | "tags"

export interface UIState {
	leftSidebarCollapsed: boolean
	leftSidebarWidth: number
	leftSidebarView: LeftSidebarView
	rightSidebarCollapsed: boolean

	toggleLeftSidebar: () => void
	setLeftSidebarWidth: (width: number) => void
	setLeftSidebarView: (view: LeftSidebarView) => void
	toggleRightSidebar: () => void

	quickFinderOpen: boolean
	toggleQuickFinder: () => void

	commandPaletteOpen: boolean
	toggleCommandPalette: () => void

	tagPickerOpen: boolean
	toggleTagPicker: () => void
}

const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 400

export const useUIStore = create<UIState>()(
	devtools(
		immer((set) => ({
			leftSidebarCollapsed: false,
			leftSidebarWidth: 240,
			leftSidebarView: "files" as LeftSidebarView,
			rightSidebarCollapsed: true,

			toggleLeftSidebar: () =>
				set((s) => {
					s.leftSidebarCollapsed = !s.leftSidebarCollapsed
				}),

			setLeftSidebarWidth: (width) =>
				set((s) => {
					s.leftSidebarWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width))
				}),

			setLeftSidebarView: (view) =>
				set((s) => {
					s.leftSidebarView = view
				}),

			toggleRightSidebar: () =>
				set((s) => {
					s.rightSidebarCollapsed = !s.rightSidebarCollapsed
				}),

			toggleQuickFinder: () =>
				set((s) => {
					s.quickFinderOpen = !s.quickFinderOpen
				}),

			commandPaletteOpen: false,

			toggleCommandPalette: () =>
				set((s) => {
					s.commandPaletteOpen = !s.commandPaletteOpen
				}),

			tagPickerOpen: false,

			toggleTagPicker: () =>
				set((s) => {
					s.tagPickerOpen = !s.tagPickerOpen
				}),
		})),
		{ name: "uiStore" },
	),
)
