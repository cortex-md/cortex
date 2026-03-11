import type { ThemeAdapter } from "./adapter"
import { generateCSSString, generateCSSVariables } from "./cssGenerator"
import { inkTheme } from "./themes/ink"
import { paperTheme } from "./themes/paper"
import type { Theme, ThemeName } from "./types"

export class ThemeManager {
	private themes: Map<string, Theme> = new Map()
	private activeTheme: Theme
	private listeners: Set<(theme: Theme) => void> = new Set()
	private adapter: ThemeAdapter | null

	constructor(initialTheme: ThemeName = "ink", adapter: ThemeAdapter | null = null) {
		this.adapter = adapter
		this.themes.set("paper", paperTheme)
		this.themes.set("ink", inkTheme)
		this.activeTheme = this.themes.get(initialTheme) || inkTheme
	}

	getTheme(name: ThemeName): Theme {
		return this.themes.get(name) || inkTheme
	}

	getActiveTheme(): Theme {
		return this.activeTheme
	}

	setActiveTheme(name: ThemeName): void {
		const theme = this.themes.get(name)
		if (!theme) return

		this.activeTheme = theme
		this.adapter?.applyTheme(name)
		this.listeners.forEach((listener) => {
			listener(theme)
		})
	}

	getAllThemes(): Theme[] {
		return Array.from(this.themes.values())
	}

	getCSSVariables(themeName?: ThemeName): Record<string, string> {
		const theme = themeName ? this.themes.get(themeName) : this.activeTheme
		return theme ? generateCSSVariables(theme) : {}
	}

	injectAllThemes(): void {
		for (const theme of this.themes.values()) {
			const cssString = generateCSSString(theme)
			this.adapter?.injectCSS(cssString, theme.name)
		}
	}

	applyOverrides(overrides: Record<string, string>): void {
		this.adapter?.applyOverrides(overrides)
	}

	clearOverrides(): void {
		this.adapter?.clearOverrides()
	}

	subscribe(listener: (theme: Theme) => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	registerTheme(theme: Theme): void {
		this.themes.set(theme.name, theme)
	}
}

let instance: ThemeManager

export function getThemeManager(): ThemeManager {
	if (!instance) {
		instance = new ThemeManager()
	}
	return instance
}

export function initThemeManager(
	initialTheme: ThemeName = "ink",
	adapter: ThemeAdapter | null = null,
): ThemeManager {
	if (!instance) {
		instance = new ThemeManager(initialTheme, adapter)
		instance.injectAllThemes()
		adapter?.applyTheme(initialTheme)
	}
	return instance
}
