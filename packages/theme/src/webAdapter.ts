import type { ThemeAdapter } from "./adapter"

const THEME_CLASS_REGEX = /theme-\w+/g
const OVERRIDE_STYLE_ID = "cortex-theme-overrides"

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

	applyOverrides(overrides: Record<string, string>): void {
		let style = document.getElementById(OVERRIDE_STYLE_ID) as HTMLStyleElement | null
		if (!style) {
			style = document.createElement("style")
			style.id = OVERRIDE_STYLE_ID
			document.head.appendChild(style)
		}

		const declarations = Object.entries(overrides)
			.map(([prop, value]) => `  ${prop}: ${value} !important;`)
			.join("\n")

		style.textContent = `body {\n${declarations}\n}`
	}

	clearOverrides(): void {
		const style = document.getElementById(OVERRIDE_STYLE_ID)
		if (style) style.remove()
	}
}
