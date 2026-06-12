import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useHotkey } from "@cortex/hotkeys"
import { registerCommand } from "@cortex/plugin-runtime"
import { useSettingsStore } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"
import {
	CalendarIcon,
	FileIcon,
	PanelLeftIcon,
	SearchIcon,
	SettingsIcon,
	SunMoonIcon,
	TagIcon,
	TerminalIcon,
} from "lucide-react"
import { useCallback, useEffect } from "react"
import { reportAppError } from "../utils/reportAppError"

export function useAppCommands(): void {
	const { vault, createFile, openDailyNote } = useVaultStore()
	const { panes, activePaneId, closeTab, goToTabIndex, navigateMRU, openTab, reopenLastClosed } =
		useWorkspaceStore()
	const leftSidebarCollapsed = useUIStore((state) => state.leftSidebarCollapsed)
	const setLeftSidebarView = useUIStore((state) => state.setLeftSidebarView)
	const toggleLeftSidebar = useUIStore((state) => state.toggleLeftSidebar)
	const toggleQuickFinder = useUIStore((state) => state.toggleQuickFinder)
	const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
	const toggleTagPicker = useUIStore((state) => state.toggleTagPicker)
	const openSettings = useUIStore((state) => state.openSettings)
	const themeName = useSettingsStore((state) => state.settings.appearance.theme)

	const openNewNote = useCallback(async () => {
		if (!vault) return
		try {
			openTab(await createFile(vault.path, "Untitled"))
		} catch (error) {
			await reportAppError({
				operation: "create-new-note",
				source: "app-command",
				cause: error,
				userMessage: "The note could not be created.",
			})
		}
	}, [createFile, openTab, vault])

	const openDaily = useCallback(async () => {
		try {
			const filePath = await openDailyNote()
			if (filePath) openTab(filePath)
		} catch (error) {
			await reportAppError({
				operation: "open-daily-note",
				source: "app-command",
				cause: error,
				userMessage: "The daily note could not be opened.",
			})
		}
	}, [openDailyNote, openTab])

	useHotkey("file.new", openNewNote)
	useHotkey(
		"file.close-tab",
		useCallback(() => {
			const activeTabId = panes[activePaneId]?.activeTabId
			if (activeTabId) closeTab(activeTabId, activePaneId)
		}, [activePaneId, closeTab, panes]),
	)
	useHotkey("file.reopen-closed", reopenLastClosed)
	useHotkey("navigate.quick-finder", toggleQuickFinder)
	useHotkey("navigate.command-palette", toggleCommandPalette)
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
		}, [leftSidebarCollapsed, setLeftSidebarView, toggleLeftSidebar]),
	)
	useHotkey(
		"app.settings",
		useCallback(() => openSettings(), [openSettings]),
	)
	useHotkey("tags.toggle-picker", toggleTagPicker)
	useHotkey("navigate.daily-note", openDaily)

	useEffect(() => {
		const unregister = [
			registerCommand({
				id: "file.new",
				label: "New Note",
				category: "File",
				icon: FileIcon,
				execute: openNewNote,
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
					const themeManager = getThemeManager()
					const currentIsDark = themeManager.getActiveTheme().isDark
					themeManager.setActiveTheme(
						themeManager.resolveTheme(themeName, currentIsDark ? "light" : "dark"),
					)
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
				execute: openDaily,
			}),
		]
		return () => {
			for (const unregisterCommand of unregister) unregisterCommand()
		}
	}, [
		leftSidebarCollapsed,
		openDaily,
		openNewNote,
		openSettings,
		setLeftSidebarView,
		themeName,
		toggleCommandPalette,
		toggleLeftSidebar,
		toggleQuickFinder,
		toggleTagPicker,
	])
}
