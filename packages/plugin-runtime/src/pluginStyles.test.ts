import { describe, expect, it } from "vitest"
import { scopePluginMarkdownStyles } from "./pluginStyles"

describe("scopePluginMarkdownStyles", () => {
	it("scopes each selector and preserves existing markdown roots", () => {
		const css = scopePluginMarkdownStyles(".custom, .markdown-surface .existing { color: red }")

		expect(css).toContain(":where(.markdown-surface) .custom")
		expect(css).toContain(".markdown-surface .existing")
		expect(css).not.toContain(":where(.markdown-surface) .markdown-surface .existing")
	})

	it.each([
		"@import url(theme.css);",
		"@font-face { font-family: Test; }",
		"@keyframes pulse {}",
	])("rejects global CSS: %s", (source) => {
		expect(() => scopePluginMarkdownStyles(source)).toThrow("Plugin styles cannot use")
	})

	it("scopes selectors inside conditional rules", () => {
		const css = scopePluginMarkdownStyles("@media (width > 400px) { .custom { color: red } }")

		expect(css).toContain("@media")
		expect(css).toContain(":where(.markdown-surface) .custom")
	})
})
