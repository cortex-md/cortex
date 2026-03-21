import type { AppearanceSettings } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"

const DEFAULT_ACCENT_COLOR = "#e8a83c"

function buildFontStack(fontFamily: string, fallbackCategory: string): string {
	if (fontFamily === "System Default") {
		return `system-ui, -apple-system, ${fallbackCategory}`
	}
	return `"${fontFamily}", system-ui, -apple-system, ${fallbackCategory}`
}

function buildAccentOverrides(hex: string): Record<string, string> {
	const activeTheme = getThemeManager().getActiveTheme()
	const bgPrimary = activeTheme.tokens.semantic.bg.primary
	const hoverBase = activeTheme.isDark ? "black" : "white"
	return {
		"--accent": hex,
		"--accent-border": hex,
		"--accent-hover": `color-mix(in srgb, ${hex} 80%, ${hoverBase})`,
		"--accent-subtle": `color-mix(in srgb, ${hex} 12%, ${bgPrimary})`,
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

	if (appearance.accentColor !== DEFAULT_ACCENT_COLOR) {
		Object.assign(overrides, buildAccentOverrides(appearance.accentColor))
	}

	overrides["--font-ui"] = buildFontStack(appearance.uiFontFamily, "sans-serif")
	overrides["--ui-font-size"] = `${appearance.uiFontSize}px`
	overrides["font-size"] = `${appearance.uiFontSize}px`
	overrides["--font-editor"] = buildFontStack(appearance.editorFontFamily, "serif")
	overrides["--editor-font-size"] = `${appearance.editorFontSize}px`
	overrides["--editor-line-height"] = String(appearance.lineHeight)

	return overrides
}

function resolveColorscheme(colorscheme: "light" | "dark" | "system"): "light" | "dark" {
	if (colorscheme === "system") {
		return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
	}
	return colorscheme
}

export function applyAppearanceSettings(appearance: AppearanceSettings): void {
	const themeManager = getThemeManager()
	const resolved = resolveColorscheme(appearance.colorscheme)
	const themeName = themeManager.resolveTheme(appearance.theme, resolved)
	themeManager.setActiveTheme(themeName)

	const overrides = buildAppearanceOverrides(appearance)
	themeManager.applyOverrides(overrides)
}
