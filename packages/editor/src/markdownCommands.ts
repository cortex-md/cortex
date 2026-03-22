import type { EditorView } from "@codemirror/view"

function wrapOrInsert(view: EditorView, marker: string): boolean {
	const { state } = view
	const { from, to } = state.selection.main
	const selected = state.sliceDoc(from, to)

	if (from !== to) {
		if (
			selected.startsWith(marker) &&
			selected.endsWith(marker) &&
			selected.length > marker.length * 2
		) {
			view.dispatch({
				changes: { from, to, insert: selected.slice(marker.length, -marker.length) },
				selection: { anchor: from, head: to - marker.length * 2 },
			})
		} else {
			view.dispatch({
				changes: { from, to, insert: `${marker}${selected}${marker}` },
				selection: { anchor: from, head: to + marker.length * 2 },
			})
		}
	} else {
		view.dispatch({
			changes: { from, insert: `${marker}${marker}` },
			selection: { anchor: from + marker.length },
		})
	}
	return true
}

function toggleLinePrefix(view: EditorView, prefix: string): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)

	if (line.text.startsWith(prefix)) {
		view.dispatch({
			changes: { from: line.from, to: line.from + prefix.length, insert: "" },
			selection: { anchor: Math.max(line.from, state.selection.main.head - prefix.length) },
		})
	} else {
		const stripped = stripBlockPrefixes(line.text)
		const strippedLength = line.text.length - stripped.length
		view.dispatch({
			changes: { from: line.from, to: line.from + strippedLength, insert: prefix },
			selection: { anchor: state.selection.main.head + (prefix.length - strippedLength) },
		})
	}
	return true
}

function stripBlockPrefixes(text: string): string {
	return text
		.replace(/^#{1,6} /, "")
		.replace(/^> /, "")
		.replace(/^- \[[ x]\] /, "")
		.replace(/^- /, "")
		.replace(/^\d+\. /, "")
}

export function toggleBold(view: EditorView): boolean {
	return wrapOrInsert(view, "**")
}

export function toggleItalic(view: EditorView): boolean {
	return wrapOrInsert(view, "*")
}

export function toggleStrikethrough(view: EditorView): boolean {
	return wrapOrInsert(view, "~~")
}

export function toggleInlineCode(view: EditorView): boolean {
	return wrapOrInsert(view, "`")
}

export function insertLink(view: EditorView): boolean {
	const { state } = view
	const { from, to } = state.selection.main
	const selected = state.sliceDoc(from, to)

	if (from !== to) {
		view.dispatch({
			changes: { from, to, insert: `[${selected}](url)` },
			selection: { anchor: from + selected.length + 3, head: from + selected.length + 6 },
		})
	} else {
		view.dispatch({
			changes: { from, insert: "[](url)" },
			selection: { anchor: from + 1 },
		})
	}
	return true
}

export function insertImage(view: EditorView): boolean {
	const { state } = view
	const { from, to } = state.selection.main
	const selected = state.sliceDoc(from, to)
	const alt = from !== to ? selected : "alt"

	view.dispatch({
		changes: { from, to, insert: `![${alt}](url)` },
		selection: { anchor: from + alt.length + 5, head: from + alt.length + 8 },
	})
	return true
}

export function toggleHeading(view: EditorView, level: 1 | 2 | 3): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)
	const prefix = `${"#".repeat(level)} `
	const existingHeadingMatch = line.text.match(/^(#{1,6}) /)

	if (existingHeadingMatch) {
		const existingPrefix = existingHeadingMatch[0]
		if (existingHeadingMatch[1].length === level) {
			view.dispatch({
				changes: { from: line.from, to: line.from + existingPrefix.length, insert: "" },
				selection: {
					anchor: Math.max(line.from, state.selection.main.head - existingPrefix.length),
				},
			})
		} else {
			view.dispatch({
				changes: { from: line.from, to: line.from + existingPrefix.length, insert: prefix },
				selection: { anchor: state.selection.main.head + (prefix.length - existingPrefix.length) },
			})
		}
	} else {
		view.dispatch({
			changes: { from: line.from, insert: prefix },
			selection: { anchor: state.selection.main.head + prefix.length },
		})
	}
	return true
}

export function toggleBlockquote(view: EditorView): boolean {
	return toggleLinePrefix(view, "> ")
}

export function insertCodeBlock(view: EditorView): boolean {
	const { state } = view
	const { from } = state.selection.main

	view.dispatch({
		changes: { from, insert: "```\n\n```" },
		selection: { anchor: from + 4 },
	})
	return true
}

export function insertTable(view: EditorView): boolean {
	const { state } = view
	const { from } = state.selection.main
	const template =
		"| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |"

	view.dispatch({
		changes: { from, insert: template },
		selection: { anchor: from + 2, head: from + 10 },
	})
	return true
}

export function insertCallout(view: EditorView): boolean {
	const { state } = view
	const { from } = state.selection.main

	view.dispatch({
		changes: { from, insert: "> [!NOTE]\n> " },
		selection: { anchor: from + 12 },
	})
	return true
}

export function toggleTaskList(view: EditorView): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)
	const taskMatch = line.text.match(/^(\s*- \[)( |x)(\] )/)

	if (taskMatch) {
		const checkChar = taskMatch[2] === " " ? "x" : " "
		const checkOffset = line.from + taskMatch[1].length
		view.dispatch({
			changes: { from: checkOffset, to: checkOffset + 1, insert: checkChar },
		})
	} else {
		const stripped = stripBlockPrefixes(line.text)
		const strippedLength = line.text.length - stripped.length
		const prefix = "- [ ] "
		view.dispatch({
			changes: { from: line.from, to: line.from + strippedLength, insert: prefix },
			selection: { anchor: state.selection.main.head + (prefix.length - strippedLength) },
		})
	}
	return true
}

export function toggleUnorderedList(view: EditorView): boolean {
	return toggleLinePrefix(view, "- ")
}

export function toggleOrderedList(view: EditorView): boolean {
	return toggleLinePrefix(view, "1. ")
}

export function duplicateLine(view: EditorView): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)
	const lineText = line.text

	view.dispatch({
		changes: { from: line.to, insert: `\n${lineText}` },
		selection: { anchor: line.to + 1 + (state.selection.main.head - line.from) },
	})
	return true
}

export function copyLine(view: EditorView): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)
	navigator.clipboard.writeText(line.text)
	return true
}

export function removeParagraphFormatting(view: EditorView): boolean {
	const { state } = view
	const line = state.doc.lineAt(state.selection.main.head)
	const stripped = stripBlockPrefixes(line.text)
	const strippedLength = line.text.length - stripped.length

	if (strippedLength === 0) return false

	view.dispatch({
		changes: { from: line.from, to: line.from + strippedLength, insert: "" },
		selection: { anchor: Math.max(line.from, state.selection.main.head - strippedLength) },
	})
	return true
}
