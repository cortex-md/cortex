import type { ThemeAdapter } from "./adapter"

const THEME_CLASS_REGEX = /theme-(paper|ink)/g

export class WebThemeAdapter implements ThemeAdapter {
	applyTheme(themeName: string): void {
		document.body.className = document.body.className.replace(THEME_CLASS_REGEX, "").trim()
		document.body.classList.add(`theme-${themeName}`)
	}

	injectCSS(cssString: string, themeName: string): void {
		const existing = document.querySelector(`style[data-theme="${themeName}"]`)
		if (existing) {
			existing.textContent = cssString
			return
		}
		const style = document.createElement("style")
		style.textContent = cssString
		style.setAttribute("data-theme", themeName)
		document.head.appendChild(style)
	}
}
