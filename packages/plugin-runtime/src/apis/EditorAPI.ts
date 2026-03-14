import type { Disposable, PluginAPI } from "@cortex/plugin-api"

type EditorViewLike = {
	dispatch: (spec: { changes?: unknown }) => void
	state: { doc: { toString: () => string }; selection: { main: { from: number; to: number } } }
}

type ReconfigureFn = (view: EditorViewLike, extensions: unknown[]) => void

let editorViewRef: EditorViewLike | null = null
let reconfigureFn: ReconfigureFn | null = null
const registeredExtensions = new Map<string, unknown>()
let nextExtensionId = 0

export function setEditorViewRef(view: EditorViewLike | null): void {
	editorViewRef = view
}

export function setReconfigurePluginExtensions(fn: ReconfigureFn): void {
	reconfigureFn = fn
}

function applyExtensions(): void {
	if (!editorViewRef || !reconfigureFn) return
	reconfigureFn(editorViewRef, Array.from(registeredExtensions.values()))
}

export function createEditorAPI(
	getActiveFilePath: () => string | null,
	getActiveFileContent: () => string | null,
): PluginAPI["editor"] {
	return {
		registerExtension(extension: unknown): Disposable {
			const id = `ext-${nextExtensionId++}`
			registeredExtensions.set(id, extension)
			applyExtensions()
			return {
				dispose() {
					registeredExtensions.delete(id)
					applyExtensions()
				},
			}
		},

		getActiveFilePath() {
			return getActiveFilePath()
		},

		getActiveFileContent() {
			return getActiveFileContent()
		},

		insertAtCursor(text: string): void {
			if (!editorViewRef) return
			const { from } = editorViewRef.state.selection.main
			editorViewRef.dispatch({
				changes: { from, insert: text },
			})
		},

		replaceSelection(text: string): void {
			if (!editorViewRef) return
			const { from, to } = editorViewRef.state.selection.main
			editorViewRef.dispatch({
				changes: { from, to, insert: text },
			})
		},
	}
}
