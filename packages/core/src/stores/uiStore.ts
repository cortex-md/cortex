import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export type LeftSidebarView = "files" | "search" | "bookmarks" | "tags"
export type MarketplaceTab = "plugins" | "themes"
export type AuthView = "login" | "register"

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

	settingsOpen: boolean
	settingsInitialSection: string | null
	openSettings: (section?: string) => void
	closeSettings: () => void

	authOpen: boolean
	authInitialView: AuthView
	authReturnTo: string | null
	openAuth: (view?: AuthView, returnTo?: string | null) => void
	closeAuth: () => void

	marketplaceInitialTab: MarketplaceTab
	openMarketplace: (tab?: MarketplaceTab) => void
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

			quickFinderOpen: false,

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

			settingsOpen: false,
			settingsInitialSection: null,

			openSettings: (section) =>
				set((s) => {
					s.settingsOpen = true
					s.settingsInitialSection = section ?? null
				}),

			closeSettings: () =>
				set((s) => {
					s.settingsOpen = false
					s.settingsInitialSection = null
				}),

			authOpen: false,
			authInitialView: "login" as AuthView,
			authReturnTo: null,

			openAuth: (view = "login", returnTo = null) =>
				set((s) => {
					s.authOpen = true
					s.authInitialView = view
					s.authReturnTo = returnTo
				}),

			closeAuth: () =>
				set((s) => {
					s.authOpen = false
					s.authReturnTo = null
				}),

			marketplaceInitialTab: "plugins" as MarketplaceTab,

			openMarketplace: (tab = "plugins") =>
				set((s) => {
					s.settingsOpen = true
					s.settingsInitialSection = "marketplace"
					s.marketplaceInitialTab = tab
				}),
		})),
		{ name: "uiStore" },
	),
)
