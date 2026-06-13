import { afterEach, describe, expect, it } from "vitest"
import { WebThemeAdapter } from "../../../features/themes/webThemeAdapter"

afterEach(() => {
	document.body.className = ""
	document.head.querySelectorAll("style[data-theme]").forEach((element) => {
		element.remove()
	})
})

describe("WebThemeAdapter", () => {
	it("replaces hyphenated community theme classes without removing unrelated classes", () => {
		document.body.className = "app-ready theme-nord-deep-dark native-shell"

		new WebThemeAdapter().applyTheme("paper", "light")

		expect(document.body.classList.contains("theme-nord-deep-dark")).toBe(false)
		expect(document.body.classList.contains("theme-paper")).toBe(true)
		expect(document.body.classList.contains("app-ready")).toBe(true)
		expect(document.body.classList.contains("native-shell")).toBe(true)
		expect(document.body.dataset.themeScheme).toBe("light")
	})
})
