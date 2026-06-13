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

function createEditor(content: string): EditorView {
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

describe("live preview lists", () => {
	it("projects unordered and ordered markers", () => {
		createEditor("- alpha\n\n1. first\n2. second\n\ntail")

		expect(
			Array.from(document.querySelectorAll(".cm-list-marker")).map((marker) => marker.textContent),
		).toEqual(["•", "1.", "2."])
	})

	it("reveals and restores the raw marker for the active list item line", () => {
		const content = "- alpha\n- beta\n\ntail"
		const view = createEditor(content)

		expect(document.querySelectorAll(".cm-list-marker")).toHaveLength(2)
		view.dispatch({ selection: { anchor: content.indexOf("alpha") + 2 } })
		expect(document.querySelectorAll(".cm-list-marker")).toHaveLength(1)
		expect(document.querySelector(".cm-content")?.textContent).toContain("- alpha")
		expect(view.state.doc.toString()).toBe(content)

		view.dispatch({ selection: { anchor: content.length } })
		expect(document.querySelectorAll(".cm-list-marker")).toHaveLength(2)
		expect(view.state.doc.toString()).toBe(content)
	})

	it("keeps nested bullets and task checkboxes projected", () => {
		const content = "- parent\n  - child\n    - grandchild\n- [ ] task\n\ntail"
		const view = createEditor(content)

		expect(document.querySelectorAll(".cm-list-marker")).toHaveLength(4)
		expect(document.querySelector(".cm-checkbox")).not.toBeNull()

		view.dispatch({ selection: { anchor: content.indexOf("task") + 1 } })
		expect(document.querySelectorAll(".cm-list-marker")).toHaveLength(3)
		expect(document.querySelector(".cm-checkbox")).not.toBeNull()
		expect(document.querySelector(".cm-content")?.textContent).toContain("- ")
	})
})
