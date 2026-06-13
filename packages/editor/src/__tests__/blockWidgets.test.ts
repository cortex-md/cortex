import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { GFM } from "@lezer/markdown"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { livePreviewExtension } from "../livePreview"

const editorViews: EditorView[] = []

afterEach(() => {
	for (const view of editorViews.splice(0)) view.destroy()
	document.body.replaceChildren()
})

function createBlockWidgetEditor(content: string): EditorView {
	const parent = document.createElement("div")
	document.body.appendChild(parent)
	const view = new EditorView({
		state: EditorState.create({
			doc: content,
			selection: { anchor: content.length },
			extensions: [markdown({ extensions: GFM }), livePreviewExtension()],
		}),
		parent,
	})
	editorViews.push(view)
	return view
}

describe("block live preview projections", () => {
	it("renders tables and expanded callouts on source lines", () => {
		const content = `| Name | Style |
| --- | --- |
| **Bold** | *Italic* |

> [!warning] **Important** and *urgent*
>
> Body with *emphasis*.

tail`

		expect(() => createBlockWidgetEditor(content)).not.toThrow()
		expect(document.querySelector(".cm-table-wrapper strong")?.textContent).toBe("Bold")
		expect(document.querySelector(".cm-table-wrapper em")?.textContent).toBe("Italic")
		expect(document.querySelectorAll(".cm-table-row-widget")).toHaveLength(2)
		expect(document.querySelectorAll(".cm-table-cell-widget")).toHaveLength(4)
		expect(document.querySelectorAll(".cm-callout-line").length).toBeGreaterThan(1)
		expect(
			Array.from(document.querySelectorAll(".cm-bold")).some(
				(element) => element.textContent === "Important",
			),
		).toBe(true)
		expect(
			Array.from(document.querySelectorAll(".cm-italic")).some(
				(element) => element.textContent === "urgent",
			),
		).toBe(true)
	})

	it("toggles a collapsed callout without moving the editor selection", () => {
		const content = "> [!tip]- Folded\n> Hidden\n\ntail"
		const view = createBlockWidgetEditor(content)
		const selectionBefore = view.state.selection.main.anchor
		const callout = document.querySelector(".cm-callout-wrapper")
		const toggle = callout?.querySelector<HTMLButtonElement>("[data-callout-toggle]")

		expect(callout?.classList.contains("is-collapsed")).toBe(true)
		toggle?.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }))
		toggle?.click()

		expect(document.querySelector(".cm-callout-wrapper")?.classList.contains("is-collapsed")).toBe(
			false,
		)
		expect(document.querySelectorAll(".cm-callout-line").length).toBe(2)
		expect(view.state.selection.main.anchor).toBe(selectionBefore)
	})

	it("collapses an expanded callout without moving the editor selection", () => {
		const content = "> [!tip]+ Expanded\n> Visible\n\ntail"
		const view = createBlockWidgetEditor(content)
		const selectionBefore = view.state.selection.main.anchor
		const toggle = document.querySelector<HTMLButtonElement>(
			".cm-callout-line [data-callout-toggle]",
		)

		toggle?.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }))
		toggle?.click()

		expect(document.querySelector(".cm-callout-wrapper")?.classList.contains("is-collapsed")).toBe(
			true,
		)
		expect(view.state.selection.main.anchor).toBe(selectionBefore)
	})

	it("keeps one CodeMirror line for every source line across projected blocks", () => {
		const content = `---
title: Navigation
---

| A | B |
| --- | --- |
| One | Two |

> [!tip]- Folded
> Hidden

![Image](image.png)

---`

		const view = createBlockWidgetEditor(content)

		expect(document.querySelectorAll(".cm-line")).toHaveLength(view.state.doc.lines)
		expect(document.querySelectorAll(".cm-table-line")).toHaveLength(3)
		expect(document.querySelectorAll(".cm-table-row-widget")).toHaveLength(2)
		expect(document.querySelectorAll(".cm-frontmatter-line")).toHaveLength(3)
		expect(document.querySelectorAll(".cm-callout-line")).toHaveLength(2)
	})

	it("keeps block wrapper chrome out of vertical line geometry", () => {
		const styles = readFileSync(resolve(process.cwd(), "src/livePreview/styles.css"), "utf8")

		expect(styles).not.toContain("margin-block-end:")
		expect(styles).not.toMatch(/\.cm-callout-wrapper\s*\{[^}]*padding-block:/s)
		expect(styles).not.toMatch(/\.cm-codeblock-wrapper\s*\{[^}]*padding-block:/s)
		expect(styles).toMatch(
			/\.cm-callout-wrapper\.is-collapsed\s*\{[^}]*max-height:\s*var\(--editor-line-height/s,
		)
	})
})
