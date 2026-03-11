import type { AppearanceSettings } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"

function buildFontStack(fontFamily: string, fallbackCategory: string): string {
	if (fontFamily === "System Default") {
		return `system-ui, -apple-system, ${fallbackCategory}`
	}
	return `"${fontFamily}", system-ui, -apple-system, ${fallbackCategory}`
}

function buildAccentOverrides(hex: string): Record<string, string> {
	return {
		"--accent": hex,
		"--accent-border": hex,
		"--accent-hover": `color-mix(in srgb, ${hex} 80%, white)`,
		"--accent-subtle": `color-mix(in srgb, ${hex} 12%, transparent)`,
		"--accent-text": hex,
		"--border-focus": hex,
		"--ring": hex,
		"--tab-accent": hex,
		"--sidebar-primary": hex,
		"--sidebar-ring": hex,
		"--chart-1": hex,
	}
}

export function buildAppearanceOverrides(appearance: AppearanceSettings): Record<string, string> {
	const overrides: Record<string, string> = {}

	if (appearance.accentColor !== "#e8a83c") {
		Object.assign(overrides, buildAccentOverrides(appearance.accentColor))
	}

	overrides["--font-ui"] = buildFontStack(appearance.uiFontFamily, "sans-serif")
	overrides["font-size"] = `${appearance.uiFontSize}px`
	overrides["--font-editor"] = buildFontStack(appearance.editorFontFamily, "serif")
	overrides["--editor-font-size"] = `${appearance.editorFontSize}px`

	return overrides
}

export function applyAppearanceSettings(appearance: AppearanceSettings): void {
	const themeManager = getThemeManager()

	const themeName =
		appearance.colorscheme === "system"
			? window.matchMedia("(prefers-color-scheme: dark)").matches
				? "ink"
				: "paper"
			: appearance.colorscheme === "dark"
				? "ink"
				: "paper"
	themeManager.setActiveTheme(themeName)

	const overrides = buildAppearanceOverrides(appearance)
	themeManager.applyOverrides(overrides)
}
