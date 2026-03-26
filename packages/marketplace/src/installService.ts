import { getPlatform } from "@cortex/platform"
import { discoverCommunityPlugins, usePluginStore } from "@cortex/plugin-runtime"
import { getThemeManager } from "@cortex/theme"
import { fetchLatestRelease } from "./registryService"
import type { GitHubReleaseAsset, RegistryEntry } from "./types"

async function downloadAsset(asset: GitHubReleaseAsset, destPath: string): Promise<void> {
	const response = await getPlatform().http.fetch(asset.browser_download_url)
	if (!response.ok) throw new Error(`Failed to download ${asset.name}: ${response.status}`)
	const content = await response.text()
	await getPlatform().fs.writeFile(destPath, content)
}

function findAsset(assets: GitHubReleaseAsset[], name: string): GitHubReleaseAsset | undefined {
	return assets.find((a) => a.name === name)
}

export async function installPlugin(
	entry: RegistryEntry,
	pluginsDir: string,
	loadCommunityPlugins: (dir: string) => Promise<void>,
): Promise<void> {
	const release = await fetchLatestRelease(entry.repo)
	const destDir = `${pluginsDir}/${entry.id}`
	await getPlatform().fs.createDir(destDir)

	const manifestAsset = findAsset(release.assets, "manifest.json")
	const mainAsset = findAsset(release.assets, "main.js")
	if (!manifestAsset || !mainAsset) {
		throw new Error(`Release for ${entry.id} is missing required assets (manifest.json, main.js)`)
	}

	await downloadAsset(manifestAsset, `${destDir}/manifest.json`)
	await downloadAsset(mainAsset, `${destDir}/main.js`)

	const stylesAsset = findAsset(release.assets, "styles.css")
	if (stylesAsset) {
		await downloadAsset(stylesAsset, `${destDir}/styles.css`)
	}

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
	const release = await fetchLatestRelease(entry.repo)
	const destDir = `${themesDir}/${entry.id}`
	await getPlatform().fs.createDir(destDir)

	const manifestAsset = findAsset(release.assets, "manifest.json")
	if (!manifestAsset) {
		throw new Error(`Release for ${entry.id} is missing manifest.json`)
	}
	await downloadAsset(manifestAsset, `${destDir}/manifest.json`)

	const manifestContent = await getPlatform().fs.readFile(`${destDir}/manifest.json`)
	const parsedManifest = JSON.parse(manifestContent) as { colorschemes?: Record<string, string> }
	const colorschemes = parsedManifest.colorschemes ?? {}

	for (const [key, cssFile] of Object.entries(colorschemes)) {
		const cssAsset = findAsset(release.assets, cssFile) ?? findAsset(release.assets, `${key}.css`)
		if (!cssAsset) {
			throw new Error(`Release for ${entry.id} is missing colorscheme asset: ${key}.css`)
		}
		await downloadAsset(cssAsset, `${destDir}/${cssFile}`)
	}

	await reloadCommunityThemes(themesDir)
}

export async function uninstallTheme(id: string, themesDir: string): Promise<void> {
	const destDir = `${themesDir}/${id}`
	await getPlatform().fs.deleteFile(destDir)
	getThemeManager().unregisterTheme(`${id}-dark`)
	getThemeManager().unregisterTheme(`${id}-light`)
}
