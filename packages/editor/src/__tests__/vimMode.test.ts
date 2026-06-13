import { undo } from "@codemirror/commands"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { getCM, Vim } from "@replit/codemirror-vim"
import { afterEach, describe, expect, it } from "vitest"
import { baseExtensions, DEFAULT_EDITOR_CONFIG, reconfigureEditor } from "../extensions"

const editorViews: EditorView[] = []

afterEach(() => {
	for (const view of editorViews.splice(0)) view.destroy()
	document.body.replaceChildren()
})

function createEditor(vimMode: boolean): EditorView {
	const parent = document.createElement("div")
	document.body.appendChild(parent)
	const view = new EditorView({
		state: EditorState.create({
			doc: "alpha beta\ngamma",
			extensions: [
				...baseExtensions({ ...DEFAULT_EDITOR_CONFIG, vimMode }, { livePreview: false }),
			],
		}),
		parent,
	})
	editorViews.push(view)
	return view
}

describe("Vim mode", () => {
	it("is disabled by default", () => {
		const view = createEditor(false)

		expect(getCM(view)).toBeNull()
		expect(view.scrollDOM.classList.contains("cm-vimMode")).toBe(false)
		expect(document.querySelector(".cm-vimCursorLayer")).toBeNull()
	})

	it("toggles without recreating the editor or changing its document", () => {
		const view = createEditor(false)
		const originalDocument = view.state.doc.toString()
		view.dispatch({ changes: { from: view.state.doc.length, insert: " delta" } })
		const editedDocument = view.state.doc.toString()

		reconfigureEditor(view, { ...DEFAULT_EDITOR_CONFIG, vimMode: true })

		expect(getCM(view)).not.toBeNull()
		expect(view.scrollDOM.classList.contains("cm-vimMode")).toBe(true)
		expect(document.querySelector(".cm-vimCursorLayer")).not.toBeNull()
		expect(document.querySelector(".cm-selectionLayer")).not.toBeNull()
		expect(view.state.doc.toString()).toBe(editedDocument)

		reconfigureEditor(view, { ...DEFAULT_EDITOR_CONFIG, vimMode: false })

		expect(getCM(view)).toBeNull()
		expect(view.scrollDOM.classList.contains("cm-vimMode")).toBe(false)
		expect(document.querySelector(".cm-vimCursorLayer")).toBeNull()
		expect(view.state.doc.toString()).toBe(editedDocument)
		expect(undo(view)).toBe(true)
		expect(view.state.doc.toString()).toBe(originalDocument)
	})

	it("supports visual selection and the command-line panel", () => {
		const view = createEditor(true)
		const vimEditor = getCM(view)

		expect(vimEditor).not.toBeNull()
		Vim.handleKey(vimEditor as NonNullable<typeof vimEditor>, "v", "user")
		Vim.handleKey(vimEditor as NonNullable<typeof vimEditor>, "l", "user")
		expect(view.state.selection.main.empty).toBe(false)

		Vim.handleKey(vimEditor as NonNullable<typeof vimEditor>, "<Esc>", "user")
		expect(view.state.selection.main.empty).toBe(true)

		Vim.handleKey(vimEditor as NonNullable<typeof vimEditor>, ":", "user")
		expect(document.querySelector(".cm-panel.cm-vim-panel")).not.toBeNull()
		const commandInput = document.querySelector<HTMLInputElement>(".cm-vim-panel input")
		expect(commandInput).not.toBeNull()

		const escapeEvent = new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
		Object.defineProperty(escapeEvent, "keyCode", { value: 27 })
		commandInput?.dispatchEvent(escapeEvent)
		expect(document.querySelector(".cm-panel.cm-vim-panel")).toBeNull()
	})
})
