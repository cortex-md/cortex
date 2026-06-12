import { getPlatform, type VaultMetadata } from "@cortex/platform"
import {
	disableAllPlugins,
	discoverCommunityPlugins,
	getCommunityPluginsDir,
	loadEnabledPlugins,
	reloadCommunityPlugins,
	setCommunityPluginExternal,
	setCommunityPluginsDir,
} from "@cortex/plugin-runtime"
import { useEffect } from "react"
import { reportAppError } from "../utils/reportAppError"

export function useCommunityPluginLifecycle(vault: VaultMetadata | null): void {
	useEffect(() => {
		if (!vault) {
			void disableAllPlugins()
			return
		}
		let cancelled = false
		let stopPluginsWatcher: (() => void) | null = null
		let pluginReloadTimer: number | null = null
		const getVaultPath = () => vault.path
		const initializePlugins = async () => {
			const [codeMirrorState, codeMirrorView] = await Promise.all([
				import("@codemirror/state"),
				import("@codemirror/view"),
			])
			setCommunityPluginExternal("@codemirror/state", codeMirrorState)
			setCommunityPluginExternal("@codemirror/view", codeMirrorView)
			setCommunityPluginsDir(`${vault.path}/.cortex/plugins`)
			await getPlatform().fs.createDir(getCommunityPluginsDir())
			await discoverCommunityPlugins(getCommunityPluginsDir())
			await loadEnabledPlugins(vault.path, getVaultPath)
			if (cancelled) return
			const stopWatching = await getPlatform().fs.startWatching(
				getCommunityPluginsDir(),
				() => {
					if (pluginReloadTimer) window.clearTimeout(pluginReloadTimer)
					pluginReloadTimer = window.setTimeout(() => {
						void reloadCommunityPlugins(getCommunityPluginsDir(), getVaultPath)
					}, 300)
				},
				{ includeHidden: true, followSymlinks: true },
			)
			if (cancelled) {
				stopWatching()
				return
			}
			stopPluginsWatcher = stopWatching
		}
		initializePlugins().catch((error) => {
			void reportAppError({
				operation: "initialize-community-plugins",
				source: "app-lifecycle",
				cause: error,
			})
		})
		return () => {
			cancelled = true
			if (pluginReloadTimer) window.clearTimeout(pluginReloadTimer)
			stopPluginsWatcher?.()
			void disableAllPlugins()
		}
	}, [vault])
}
