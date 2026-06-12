import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { GFM } from "@lezer/markdown"
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

describe("block live preview widgets", () => {
	it("renders tables as widgets and expanded callouts on source lines", () => {
		const content = `| Name | Style |
| --- | --- |
| **Bold** | *Italic* |

> [!warning] **Important** and *urgent*
>
> Body with *emphasis*.

tail`

		expect(() => createBlockWidgetEditor(content)).not.toThrow()
		expect(document.querySelector(".cm-table-widget strong")?.textContent).toBe("Bold")
		expect(document.querySelector(".cm-table-widget em")?.textContent).toBe("Italic")
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
		const callout = document.querySelector(".cm-callout-widget")
		const toggle = callout?.querySelector<HTMLButtonElement>("[data-callout-toggle]")

		expect(callout?.classList.contains("is-collapsed")).toBe(true)
		toggle?.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }))
		toggle?.click()

		expect(document.querySelector(".cm-callout-widget")).toBeNull()
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

		expect(document.querySelector(".cm-callout-widget")).not.toBeNull()
		expect(view.state.selection.main.anchor).toBe(selectionBefore)
	})
})
