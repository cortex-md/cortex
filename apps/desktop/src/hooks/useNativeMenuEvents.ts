import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import { useSettingsStore } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useCallback, useEffect } from "react"
import { reportAppError } from "../utils/reportAppError"

type NativeMenuAction = () => Promise<void> | void

export function useNativeMenuEvents(): void {
	const { vault, recentVaults, createFile, openVault, closeVault } = useVaultStore()
	const openTab = useWorkspaceStore((state) => state.openTab)
	const leftSidebarCollapsed = useUIStore((state) => state.leftSidebarCollapsed)
	const setLeftSidebarView = useUIStore((state) => state.setLeftSidebarView)
	const toggleLeftSidebar = useUIStore((state) => state.toggleLeftSidebar)
	const toggleCommandPalette = useUIStore((state) => state.toggleCommandPalette)
	const openSettings = useUIStore((state) => state.openSettings)
	const themeName = useSettingsStore((state) => state.settings.appearance.theme)

	const runNativeMenuAction = useCallback((operation: string, action: NativeMenuAction) => {
		Promise.resolve()
			.then(action)
			.catch((error) => {
				void reportAppError({
					operation,
					source: "native-menu",
					cause: error,
				})
			})
	}, [])

	useEffect(() => {
		const switchVault = async (vaultPath: string) => {
			if (vaultPath === vault?.path) return
			await closeVault()
			await openVault(vaultPath)
		}
		const listenerPromises: Promise<UnlistenFn | null>[] = [
			listen<string>("dock-open-vault", (event) => {
				if (!event.payload) return
				runNativeMenuAction("open-dock-vault", () => switchVault(event.payload))
			}),
			listen("menu-new-note", () => {
				if (!vault) return
				runNativeMenuAction("create-menu-note", async () => {
					openTab(await createFile(vault.path, "Untitled"))
				})
			}),
			listen("menu-open-vault", () => {
				runNativeMenuAction("open-menu-vault", async () => {
					const vaultPath = await getPlatform().dialog.pickFolder()
					if (!vaultPath) return
					const existingVault = recentVaults.find((recentVault) => recentVault.path === vaultPath)
					await closeVault()
					await openVault(
						vaultPath,
						existingVault ? undefined : { name: vaultPath.split("/").pop() ?? vaultPath },
					)
				})
			}),
			listen("menu-close-vault", () => {
				runNativeMenuAction("close-menu-vault", closeVault)
			}),
			listen("menu-open-settings", () => {
				openSettings("general")
			}),
			listen("menu-toggle-sidebar", toggleLeftSidebar),
			listen("menu-search-vault", () => {
				if (leftSidebarCollapsed) toggleLeftSidebar()
				setLeftSidebarView("search")
			}),
			listen("menu-command-palette", toggleCommandPalette),
			listen("menu-toggle-theme", () => {
				const themeManager = getThemeManager()
				const currentIsDark = themeManager.getActiveTheme().isDark
				themeManager.setActiveTheme(
					themeManager.resolveTheme(themeName, currentIsDark ? "light" : "dark"),
				)
			}),
			listen<string>("menu-recent-vault", (event) => {
				if (!event.payload) return
				runNativeMenuAction("open-recent-vault", () => switchVault(event.payload))
			}),
		].map((listenerPromise) =>
			listenerPromise.catch((error) => {
				void reportAppError({
					operation: "register-native-menu-listener",
					source: "native-menu",
					cause: error,
				})
				return null
			}),
		)

		return () => {
			for (const listenerPromise of listenerPromises) {
				void listenerPromise.then((unlisten) => unlisten?.())
			}
		}
	}, [
		closeVault,
		createFile,
		leftSidebarCollapsed,
		openSettings,
		openTab,
		openVault,
		recentVaults,
		runNativeMenuAction,
		setLeftSidebarView,
		themeName,
		toggleCommandPalette,
		toggleLeftSidebar,
		vault,
	])
}
