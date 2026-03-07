import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import { isCursorInRange } from "./utils"

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>()
	const tree = syntaxTree(view.state)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (
					node.name !== "StrongEmphasis" &&
					node.name !== "Emphasis" &&
					node.name !== "Strikethrough"
				) {
					return
				}

				const nodeFrom = node.from
				const nodeTo = node.to

				if (isCursorInRange(view.state, nodeFrom, nodeTo)) return

				const className =
					node.name === "StrongEmphasis"
						? "cm-bold"
						: node.name === "Emphasis"
							? "cm-italic"
							: "cm-strikethrough"

				const markName = node.name === "Strikethrough" ? "StrikethroughMark" : "EmphasisMark"
				const cursor = node.node.cursor()
				cursor.firstChild()

				const marks: Array<{ from: number; to: number }> = []
				do {
					if (cursor.name === markName) {
						marks.push({ from: cursor.from, to: cursor.to })
					}
				} while (cursor.nextSibling())

				if (marks.length >= 2) {
					const openMark = marks[0]
					const closeMark = marks[marks.length - 1]

					builder.add(openMark.from, openMark.to, Decoration.replace({}))
					builder.add(openMark.to, closeMark.from, Decoration.mark({ class: className }))
					builder.add(closeMark.from, closeMark.to, Decoration.replace({}))
				}
			},
		})
	}

	return builder.finish()
}

export const formattingPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet

		constructor(view: EditorView) {
			this.decorations = buildDecorations(view)
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.selectionSet || update.viewportChanged) {
				this.decorations = buildDecorations(update.view)
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	},
)
