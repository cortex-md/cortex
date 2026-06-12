import { getPlatform, type VaultMetadata } from "@cortex/platform"
import { useEffect, useState } from "react"
import { applyAppearanceSettings } from "../features/settings/applyAppearance"
import {
	loadCommunityThemes,
	reloadCommunityThemes,
	unloadCommunityThemes,
} from "../features/themes/communityThemeLoader"
import { reportAppError } from "../utils/reportAppError"

type AppearanceSettings = Parameters<typeof applyAppearanceSettings>[0]

export function useCommunityThemeLifecycle(
	vault: VaultMetadata | null,
	appearance: AppearanceSettings,
): void {
	const [themesLoaded, setThemesLoaded] = useState(false)

	useEffect(() => {
		if (!vault) {
			setThemesLoaded(false)
			return
		}
		let cancelled = false
		let stopThemesWatcher: (() => void) | null = null
		let themeReloadTimer: number | null = null
		const themesDirectory = `${vault.path}/.cortex/themes`
		const initializeThemes = async () => {
			await getPlatform().fs.createDir(themesDirectory)
			await loadCommunityThemes(themesDirectory)
			if (!cancelled) setThemesLoaded(true)
			if (cancelled) return
			const stopWatching = await getPlatform().fs.startWatching(
				themesDirectory,
				() => {
					if (themeReloadTimer) window.clearTimeout(themeReloadTimer)
					themeReloadTimer = window.setTimeout(() => {
						setThemesLoaded(false)
						reloadCommunityThemes(themesDirectory)
							.then(() => {
								if (!cancelled) setThemesLoaded(true)
							})
							.catch((error) => {
								void reportAppError({
									operation: "reload-community-themes",
									source: "theme-lifecycle",
									cause: error,
								})
							})
					}, 300)
				},
				{ includeHidden: true, followSymlinks: true },
			)
			if (cancelled) {
				stopWatching()
				return
			}
			stopThemesWatcher = stopWatching
		}
		initializeThemes().catch((error) => {
			if (!cancelled) setThemesLoaded(false)
			void reportAppError({
				operation: "initialize-community-themes",
				source: "theme-lifecycle",
				cause: error,
			})
		})
		return () => {
			cancelled = true
			if (themeReloadTimer) window.clearTimeout(themeReloadTimer)
			stopThemesWatcher?.()
			unloadCommunityThemes()
			setThemesLoaded(false)
		}
	}, [vault])

	useEffect(() => {
		if (!vault || !themesLoaded) return
		applyAppearanceSettings(appearance)
		if (appearance.colorscheme !== "system") return
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
		const handleSystemThemeChange = () => applyAppearanceSettings(appearance)
		mediaQuery.addEventListener("change", handleSystemThemeChange)
		return () => mediaQuery.removeEventListener("change", handleSystemThemeChange)
	}, [appearance, themesLoaded, vault])
}
