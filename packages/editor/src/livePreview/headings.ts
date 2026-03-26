import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import { isCursorOnLine } from "./utils"

interface DecorationEntry {
	from: number
	to: number
	value: Decoration
}

const HEADING_NODE_NAMES = new Set([
	"ATXHeading1",
	"ATXHeading2",
	"ATXHeading3",
	"ATXHeading4",
	"ATXHeading5",
	"ATXHeading6",
])

const HEADING_LEVEL: Record<string, number> = {
	ATXHeading1: 1,
	ATXHeading2: 2,
	ATXHeading3: 3,
	ATXHeading4: 4,
	ATXHeading5: 5,
	ATXHeading6: 6,
}

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: DecorationEntry[] = []
	const tree = syntaxTree(view.state)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (!HEADING_NODE_NAMES.has(node.name)) return

				const level = HEADING_LEVEL[node.name]
				const headingFrom = node.from
				const headingTo = node.to

				const cursorOnLine = isCursorOnLine(view.state, headingFrom, headingTo)
				const line = view.state.doc.lineAt(headingFrom)

				decorations.push({
					from: line.from,
					to: line.from,
					value: Decoration.line({ class: `cm-h${level}` }),
				})

				if (!cursorOnLine) {
					const cursor = node.node.cursor()
					cursor.firstChild()
					do {
						if (cursor.name === "HeaderMark") {
							const replaceEnd = Math.min(cursor.to + 1, line.to)
							decorations.push({
								from: cursor.from,
								to: replaceEnd,
								value: Decoration.replace({}),
							})
						}
					} while (cursor.nextSibling())
				}
			},
		})
	}

	decorations.sort((a, b) => {
		if (a.from !== b.from) return a.from - b.from
		if (a.to !== b.to) return a.to - b.to
		return 0
	})

	const builder = new RangeSetBuilder<Decoration>()
	for (const deco of decorations) {
		builder.add(deco.from, deco.to, deco.value)
	}
	return builder.finish()
}

export const headingsPlugin = ViewPlugin.fromClass(
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
