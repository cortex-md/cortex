import type { Disposable, PluginAPI, Theme } from "@cortex/plugin-api"

interface ThemeManagerLike {
	registerTheme(theme: {
		name: string
		displayName: string
		isDark: boolean
		tokens: unknown
		cssVariables: Record<string, string>
	}): void
	getActiveTheme(): { name: string }
	subscribe(listener: (theme: { name: string }) => void): () => void
}

let themeManagerRef: ThemeManagerLike | null = null

export function setThemeManagerRef(manager: ThemeManagerLike): void {
	themeManagerRef = manager
}

export function createThemeAPI(): PluginAPI["theme"] {
	return {
		register(theme: Theme): Disposable {
			if (!themeManagerRef) return { dispose() {} }
			themeManagerRef.registerTheme({
				name: theme.id,
				displayName: theme.name,
				isDark: theme.type === "dark",
				tokens: {},
				cssVariables: theme.colors,
			})
			return { dispose() {} }
		},

		getActiveThemeName(): string {
			if (!themeManagerRef) return "ink"
			return themeManagerRef.getActiveTheme().name
		},

		onThemeChange(callback: (name: string) => void): Disposable {
			if (!themeManagerRef) return { dispose() {} }
			const unsubscribe = themeManagerRef.subscribe((theme) => callback(theme.name))
			return { dispose: unsubscribe }
		},
	}
}
