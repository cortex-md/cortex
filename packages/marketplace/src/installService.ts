import { getPlatform } from "@cortex/platform"
import { discoverCommunityPlugins, usePluginStore } from "@cortex/plugin-runtime"
import { getThemeManager } from "@cortex/theme"
import { fetchLatestRelease } from "./registryService"
import type { RegistryEntry } from "./types"

async function resolveZipUrl(repo: string): Promise<string> {
	const release = await fetchLatestRelease(repo)
	const zipAsset = release.assets.find((a) => a.name.endsWith(".zip"))
	return zipAsset?.browser_download_url ?? release.zipball_url
}

export async function installPlugin(
	entry: RegistryEntry,
	pluginsDir: string,
	loadCommunityPlugins: (dir: string) => Promise<void>,
): Promise<void> {
	const zipUrl = await resolveZipUrl(entry.repo)
	const destDir = `${pluginsDir}/${entry.id}`
	await getPlatform().fs.downloadAndExtract(zipUrl, destDir)
	await discoverCommunityPlugins(pluginsDir)
	await loadCommunityPlugins(pluginsDir)
}

export async function uninstallPlugin(id: string, pluginsDir: string): Promise<void> {
	const destDir = `${pluginsDir}/${id}`
	await getPlatform().fs.deleteFile(destDir)
	usePluginStore.getState().unregisterPlugin(id)
}

export async function installTheme(
	entry: RegistryEntry,
	themesDir: string,
	reloadCommunityThemes: (dir: string) => Promise<void>,
): Promise<void> {
	const zipUrl = await resolveZipUrl(entry.repo)
	const destDir = `${themesDir}/${entry.id}`
	await getPlatform().fs.downloadAndExtract(zipUrl, destDir)
	await reloadCommunityThemes(themesDir)
}

export async function uninstallTheme(id: string, themesDir: string): Promise<void> {
	const destDir = `${themesDir}/${id}`
	await getPlatform().fs.deleteFile(destDir)
	getThemeManager().unregisterTheme(`${id}-dark`)
	getThemeManager().unregisterTheme(`${id}-light`)
}
