import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import { findFrontmatter } from "./frontmatter"
import { isCursorOnLine } from "./utils"

interface DecorationEntry {
	from: number
	to: number
	value: Decoration
}

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: DecorationEntry[] = []
	const tree = syntaxTree(view.state)
	const fm = findFrontmatter(view.state.doc)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (node.name !== "HorizontalRule") return

				const nodeFrom = node.from
				const nodeTo = node.to

				if (fm && nodeFrom < fm.to) return

				if (isCursorOnLine(view.state, nodeFrom, nodeTo)) return

				const line = view.state.doc.lineAt(nodeFrom)
				decorations.push({
					from: line.from,
					to: line.from,
					value: Decoration.line({ class: "cm-hr-line" }),
				})
				decorations.push({
					from: nodeFrom,
					to: nodeTo,
					value: Decoration.replace({}),
				})
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

export const horizontalRulePlugin = ViewPlugin.fromClass(
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
