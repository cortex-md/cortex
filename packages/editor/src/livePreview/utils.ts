import type { EditorState } from "@codemirror/state"

export function isCursorInRange(state: EditorState, from: number, to: number): boolean {
	return state.selection.ranges.some((r) => r.from <= to && r.to >= from)
}

export function isCursorOnLine(state: EditorState, lineFrom: number, lineTo: number): boolean {
	return state.selection.ranges.some((r) => {
		const cursorLine = state.doc.lineAt(r.head)
		return cursorLine.from >= lineFrom && cursorLine.from <= lineTo
	})
}
