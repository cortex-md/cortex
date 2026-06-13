import { generateCSSVariables, paperTheme, type Theme } from "@cortex/theme"
import { describe, expect, it } from "vitest"

describe("generateCSSVariables", () => {
	it("emits heading color variables", () => {
		const vars = generateCSSVariables(paperTheme)

		expect(vars["--h1-color"]).toBe("#a06a10")
		expect(vars["--h2-color"]).toBe("#8b6914")
		expect(vars["--h3-color"]).toBe("#6b4e8a")
		expect(vars["--h4-color"]).toBe("#6b3a8a")
		expect(vars["--h5-color"]).toBe("#6b6a62")
		expect(vars["--h6-color"]).toBe("#8a8980")
	})

	it("emits the compact built-in heading scale", () => {
		const vars = generateCSSVariables(paperTheme)

		expect(vars["--normal-weight"]).toBe("400")
		expect(vars["--heading-font-weight"]).toBe("600")
		expect(vars["--inline-title-margin-bottom"]).toBe("1rem")
		expect(vars["--h1-font-size"]).toBe("1.125em")
		expect(vars["--h2-font-size"]).toBe("1.05em")
		expect(vars["--h3-font-size"]).toBe("1em")
		expect(vars["--h4-font-size"]).toBe("0.9em")
		expect(vars["--h5-font-size"]).toBe("0.85em")
		expect(vars["--h6-font-size"]).toBe("0.85em")
	})

	it("falls back to syntax heading color for older themes", () => {
		const themeWithoutHeadingColors: Theme = {
			...paperTheme,
			tokens: {
				...paperTheme.tokens,
				heading: {
					fontWeight: paperTheme.tokens.heading.fontWeight,
					h1FontSize: paperTheme.tokens.heading.h1FontSize,
					h2FontSize: paperTheme.tokens.heading.h2FontSize,
					h3FontSize: paperTheme.tokens.heading.h3FontSize,
					h4FontSize: paperTheme.tokens.heading.h4FontSize,
					h5FontSize: paperTheme.tokens.heading.h5FontSize,
					h6FontSize: paperTheme.tokens.heading.h6FontSize,
				},
			},
		}

		const vars = generateCSSVariables(themeWithoutHeadingColors)

		expect(vars["--h1-color"]).toBe(paperTheme.tokens.semantic.syntax.heading)
		expect(vars["--h6-color"]).toBe(paperTheme.tokens.semantic.syntax.heading)
	})

	it("emits selection, search, and callout variables", () => {
		const vars = generateCSSVariables(paperTheme)

		expect(vars["--editor-selection-bg"]).toBe("rgba(232,168,60,0.28)")
		expect(vars["--editor-search-match-bg"]).toBe("rgba(212,160,23,0.22)")
		expect(vars["--editor-search-match-active-bg"]).toBe("rgba(232,168,60,0.42)")
		expect(vars["--callout-warning-color"]).toBe(paperTheme.tokens.status.warning)
		expect(vars["--callout-warning-bg"]).toBe(paperTheme.tokens.status.warningBg)
		expect(vars["--markdown-content-width"]).toBe("720px")
		expect(vars["--markdown-content-gutter"]).toBe("40px")
	})

	it("falls back to existing semantic colors when selection tokens are absent", () => {
		const legacyTheme: Theme = {
			...paperTheme,
			tokens: {
				...paperTheme.tokens,
				semantic: {
					...paperTheme.tokens.semantic,
					selection: undefined,
				},
			},
		}

		const vars = generateCSSVariables(legacyTheme)

		expect(vars["--editor-selection-bg"]).toBe(paperTheme.tokens.semantic.bg.selected)
		expect(vars["--editor-search-match-bg"]).toBe(paperTheme.tokens.semantic.accent.subtle)
		expect(vars["--editor-search-match-active-bg"]).toBe(paperTheme.tokens.semantic.bg.selected)
	})
})
