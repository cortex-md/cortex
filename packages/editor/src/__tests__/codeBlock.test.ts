import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { afterEach, describe, expect, it, vi } from "vitest"
import { livePreviewExtension } from "../livePreview"

const editorViews: EditorView[] = []

afterEach(() => {
	for (const view of editorViews.splice(0)) view.destroy()
	document.body.replaceChildren()
	vi.restoreAllMocks()
})

function createCodeBlockEditor(): EditorView {
	const content = "```ts\nconst first = 1\n```\n\n```ts\nconst second = 2\n```\n\ntail"
	const parent = document.createElement("div")
	document.body.appendChild(parent)
	const view = new EditorView({
		state: EditorState.create({
			doc: content,
			selection: { anchor: content.length },
			extensions: [markdown(), livePreviewExtension()],
		}),
		parent,
	})
	editorViews.push(view)
	return view
}

describe("code block live preview", () => {
	it("shows controls only for the hovered block", () => {
		createCodeBlockEditor()
		const codeBlockLines = document.querySelectorAll<HTMLElement>(".cm-codeblock-line")
		const secondBlockId = codeBlockLines[3].dataset.codeblockId

		codeBlockLines[3].dispatchEvent(new Event("pointerover", { bubbles: true }))

		const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".cm-codeblock-copy"))
		const visibleButtons = buttons.filter((button) => button.dataset.controlsVisible === "true")

		expect(visibleButtons).toHaveLength(1)
		expect(visibleButtons[0].dataset.codeblockId).toBe(secondBlockId)
	})

	it("copies on the first click without moving the editor selection", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		})
		const view = createCodeBlockEditor()
		const codeBlockLines = document.querySelectorAll<HTMLElement>(".cm-codeblock-line")
		codeBlockLines[3].dispatchEvent(new Event("pointerover", { bubbles: true }))
		const button = Array.from(
			document.querySelectorAll<HTMLButtonElement>(".cm-codeblock-copy"),
		).find((candidate) => candidate.dataset.controlsVisible === "true")
		const selectionBefore = view.state.selection.main.anchor

		button?.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }))
		button?.click()
		await Promise.resolve()

		expect(writeText).toHaveBeenCalledTimes(1)
		expect(writeText).toHaveBeenCalledWith("const second = 2")
		expect(view.state.selection.main.anchor).toBe(selectionBefore)
		expect(button?.textContent).toBe("Copied!")
	})
})
