import { describe, expect, it } from "vitest"
import { buildEditorTypographyRules } from "../extensions"

describe("buildEditorTypographyRules", () => {
	it("uses theme CSS variables for editor typography", () => {
		const rules = buildEditorTypographyRules(16)

		expect(rules["&"]).toMatchObject({
			fontSize: "var(--editor-font-size, 16px)",
			fontFamily:
				'var(--font-editor, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
			fontWeight: "var(--editor-font-weight, 400)",
		})
		expect(rules[".cm-scroller"]).toMatchObject({
			lineHeight: "var(--editor-line-height, 27px)",
		})
		expect(rules[".cm-content"]).toMatchObject({
			maxWidth: "var(--markdown-content-width, 720px)",
		})
		expect(rules[".cm-line"]).toMatchObject({
			padding: "0 var(--markdown-content-gutter, 40px)",
		})
		expect(rules[".cm-activeLine"]).toMatchObject({
			padding: "0 var(--markdown-content-gutter, 40px)",
		})
		expect(rules[".cm-content ::selection"]).toMatchObject({
			backgroundColor: "var(--editor-selection-bg, var(--bg-selected))",
		})
		expect(".cm-selectionLayer" in rules).toBe(false)
		expect(rules[".cm-cursorLayer"]).toMatchObject({ zIndex: "10" })
		expect(rules[".cm-panel.cm-search"]).toMatchObject({
			backgroundColor: "var(--bg-elevated)",
			borderBottom: "1px solid var(--border-subtle)",
		})
		expect(rules[".cm-searchMatch"]).toMatchObject({
			backgroundColor: "var(--editor-search-match-bg, var(--accent-subtle))",
		})
		expect(rules[".cm-searchMatch.cm-searchMatch-selected"]).toMatchObject({
			backgroundColor: "var(--editor-search-match-active-bg, var(--bg-selected))",
		})
	})
})
