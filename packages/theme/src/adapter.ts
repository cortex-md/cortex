export interface ThemeAdapter {
	applyTheme(themeName: string): void
	injectCSS(cssString: string, themeName: string): void
}
