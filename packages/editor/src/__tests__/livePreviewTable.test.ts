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

describe("GFM inline rendering", () => {
	it("keeps semantic formatting in text, tables, and callouts", () => {
		createEditor(`**outside** *italic* ~~strike~~

| Value | Link |
| --- | --- |
| **bold** and *italic* | [link](https://example.com) |

> [!warning]+ **Title**
> Body with *emphasis* and ~~strike~~.`)

		expect(document.querySelector(".cm-table-wrapper .cm-bold")?.textContent).toBe("bold")
		expect(document.querySelector(".cm-table-wrapper .cm-italic")?.textContent).toBe("italic")
		expect(document.querySelector(".cm-table-wrapper .cm-link")?.textContent).toBe("link")
		expect(document.querySelectorAll(".cm-bold").length).toBeGreaterThanOrEqual(1)
		expect(document.querySelectorAll(".cm-italic").length).toBeGreaterThanOrEqual(1)
		expect(document.querySelectorAll(".cm-strikethrough").length).toBeGreaterThanOrEqual(1)
	})

	it("keeps table source visible while a selection crosses the block", () => {
		const content = "| A | B |\n| --- | --- |\n| **bold** | value |\n\ntail"
		const view = createEditor(content)
		expect(document.querySelector(".cm-table-wrapper")).not.toBeNull()
		expect(document.querySelector(".cm-table-rendered-line")).not.toBeNull()
		expect(document.querySelector(".cm-table-cell")).not.toBeNull()

		view.dispatch({ selection: { anchor: 0, head: content.indexOf("tail") } })

		expect(document.querySelector(".cm-table-wrapper")).not.toBeNull()
		expect(document.querySelector(".cm-table-rendered-line")).toBeNull()
		expect(document.querySelector(".cm-table-cell")).toBeNull()
		expect(document.querySelectorAll(".cm-table-source-line")).toHaveLength(3)
		expect(document.querySelector(".cm-table-wrapper")?.textContent).toContain(
			"| **bold** | value |",
		)
	})

	it("maps table cell DOM positions to their exact source offsets", () => {
		const content = "| Alpha | Beta |\n| --- | --- |\n| Gamma | Delta |\n\ntail"
		const view = createEditor(content)
		const gammaCell = Array.from(document.querySelectorAll<HTMLElement>(".cm-table-cell")).find(
			(cell) => cell.textContent === "Gamma",
		)
		const gammaText = gammaCell?.firstChild

		expect(gammaText).not.toBeNull()
		expect(view.posAtDOM(gammaText as Node, 3)).toBe(content.indexOf("Gamma") + 3)
		expect(document.querySelector(".cm-table-row-widget")).toBeNull()
		expect(document.querySelector(".cm-table-delimiter-widget")).toBeNull()
	})

	it("keeps delimiter cells mapped while hiding only table syntax gaps", () => {
		const content = "| Left | Right |\n| :--- | ---: |\n| one | two |\n\ntail"
		const view = createEditor(content)
		const delimiterCells = Array.from(
			document.querySelectorAll<HTMLElement>(".cm-table-delimiter-cell"),
		)
		const firstDelimiterText = delimiterCells[0]?.firstChild

		expect(delimiterCells.map((cell) => cell.textContent)).toEqual([":---", "---:"])
		expect(delimiterCells.map((cell) => cell.dataset.align)).toEqual(["left", "right"])
		expect(firstDelimiterText).not.toBeNull()
		expect(view.posAtDOM(firstDelimiterText as Node, 2)).toBe(content.indexOf(":---") + 2)
		expect(document.querySelectorAll(".cm-table-rendered-line")).toHaveLength(3)
		expect(document.querySelectorAll(".cm-line")).toHaveLength(view.state.doc.lines)
	})

	it("projects GFM table alignment onto mapped cells", () => {
		createEditor("| Left | Center | Right |\n| :--- | :---: | ---: |\n| a | b | c |\n\ntail")
		const cells = Array.from(
			document.querySelectorAll<HTMLElement>(".cm-table-cell:not(.cm-table-delimiter-cell)"),
		)

		expect(cells.slice(0, 3).map((cell) => cell.dataset.align)).toEqual(["left", "center", "right"])
		expect(cells.slice(3).map((cell) => cell.dataset.align)).toEqual(["left", "center", "right"])
	})

	it("reveals blockquote markers from any cursor position in the block", () => {
		const content = "> quoted\n\ntail"
		const view = createEditor(content)

		expect(document.querySelector(".cm-blockquote")?.textContent).not.toContain(">")
		view.dispatch({ selection: { anchor: content.indexOf("quoted") + 2 } })
		expect(document.querySelector(".cm-blockquote")?.textContent).toContain(">")
	})

	it("shows horizontal rule source when the cursor enters the line", () => {
		const content = "---\n\ntail"
		const view = createEditor(content)

		expect(document.querySelector(".cm-horizontal-rule-line")).not.toBeNull()
		expect(document.querySelector(".cm-hr-widget")).toBeNull()
		expect(document.querySelector(".cm-content")?.textContent).not.toContain("---")
		view.dispatch({ selection: { anchor: 1 } })
		expect(document.querySelector(".cm-horizontal-rule-line")).toBeNull()
		expect(document.querySelector(".cm-content")?.textContent).toContain("---")
		view.dispatch({ selection: { anchor: content.length } })
		expect(document.querySelector(".cm-horizontal-rule-line")).not.toBeNull()
		expect(document.querySelectorAll(".cm-line")).toHaveLength(view.state.doc.lines)
	})

	it("reveals fenced code markers only while the cursor is inside the block", () => {
		const content = "```ts\nconst value = 1\n```\n\ntail"
		const view = createEditor(content)

		expect(document.querySelector(".cm-content")?.textContent).not.toContain("```ts")
		view.dispatch({ selection: { anchor: content.indexOf("const") } })
		expect(document.querySelector(".cm-content")?.textContent).toContain("```ts")
		view.dispatch({ selection: { anchor: content.length } })
		expect(document.querySelector(".cm-content")?.textContent).not.toContain("```ts")
		expect(document.querySelector(".cm-codeblock-lang")).toBeNull()
	})
})
