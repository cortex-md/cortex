export interface ThemeAdapter {
	applyTheme(themeName: string): void
	injectCSS(cssString: string, themeName: string): void
	applyOverrides(overrides: Record<string, string>): void
	clearOverrides(): void
}
