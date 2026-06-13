import type { FileEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import {
	type CommunityThemeManifest,
	getThemeManager,
	parseCommunityThemeManifest,
	type ThemeFamily,
} from "@cortex/theme"

export async function loadCommunityThemes(themesDir: string): Promise<void> {
	const platform = getPlatform()
	const themeManager = getThemeManager()

	let dirs: FileEntry[]
	try {
		dirs = await platform.fs.listDir(themesDir)
	} catch {
		return
	}

	for (const dir of dirs.filter((e) => e.isDir)) {
		const manifestPath = `${themesDir}/${dir.name}/manifest.json`

		let raw: string
		try {
			raw = await platform.fs.readFile(manifestPath)
		} catch {
			continue
		}

		let manifest: CommunityThemeManifest
		try {
			manifest = parseCommunityThemeManifest(raw)
		} catch {
			continue
		}

		let darkCss: string
		let lightCss: string
		try {
			;[darkCss, lightCss] = await Promise.all([
				platform.fs.readFile(`${themesDir}/${dir.name}/${manifest.colorschemes.dark}`),
				platform.fs.readFile(`${themesDir}/${dir.name}/${manifest.colorschemes.light}`),
			])
		} catch {
			continue
		}

		const family: ThemeFamily = {
			name: manifest.name,
			displayName: manifest.displayName,
			darkTheme: `${manifest.name}-dark`,
			lightTheme: `${manifest.name}-light`,
		}

		themeManager.registerCommunityFamily(family)
		themeManager.injectCSS(darkCss, family.darkTheme)
		themeManager.injectCSS(lightCss, family.lightTheme)
	}
}

export async function reloadCommunityThemes(themesDir: string): Promise<void> {
	unloadCommunityThemes()
	await loadCommunityThemes(themesDir)
}

export function unloadCommunityThemes(): void {
	const themeManager = getThemeManager()
	for (const family of themeManager.getThemeFamilies()) {
		if (family.name !== "default") {
			themeManager.unregisterTheme(family.name)
		}
	}
}
