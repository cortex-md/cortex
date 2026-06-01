import type { AppearanceSettings } from "@cortex/settings"
import { getThemeManager, type ThemeTokens } from "@cortex/theme"

const DEFAULT_ACCENT_COLOR = "#e8a83c"

function buildFontStack(fontFamily: string, fallbackCategory: string): string {
	if (fontFamily === "System Default") {
		return `system-ui, -apple-system, ${fallbackCategory}`
	}
	return `"${fontFamily}", system-ui, -apple-system, ${fallbackCategory}`
}

function buildAccentOverrides(hex: string): Record<string, string> {
	const activeTheme = getThemeManager().getActiveTheme()
	const tokens = activeTheme.tokens as Partial<ThemeTokens>
	const bgPrimary = tokens.semantic?.bg.primary ?? (activeTheme.isDark ? "#111110" : "#fafaf8")
	const bgSecondary = tokens.semantic?.bg.secondary ?? (activeTheme.isDark ? "#1a1918" : "#f5f4f0")
	const textPrimary = tokens.semantic?.text.primary ?? (activeTheme.isDark ? "#f2f2f1" : "#201d18")
	const subtleAmount = activeTheme.isDark ? 16 : 12
	const hoverAmount = activeTheme.isDark ? 24 : 18
	const activeAmount = activeTheme.isDark ? 34 : 26
	const textAmount = activeTheme.isDark ? 72 : 82
	const accentSubtle = `color-mix(in srgb, ${hex} ${subtleAmount}%, ${bgPrimary})`
	const accentText = `color-mix(in srgb, ${hex} ${textAmount}%, ${textPrimary})`

	return {
		"--accent": hex,
		"--accent-border": hex,
		"--accent-hover": `color-mix(in srgb, ${hex} ${hoverAmount}%, ${bgSecondary})`,
		"--accent-active": `color-mix(in srgb, ${hex} ${activeAmount}%, ${bgSecondary})`,
		"--accent-subtle": accentSubtle,
		"--accent-text": accentText,
		"--bg-selected": accentSubtle,
		"--border-focus": hex,
		"--ring": hex,
		"--tab-accent": hex,
		"--sidebar-primary": hex,
		"--sidebar-accent": accentSubtle,
		"--sidebar-accent-foreground": accentText,
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
