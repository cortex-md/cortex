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

interface DecorationEntry {
	from: number
	to: number
	value: Decoration
}

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: DecorationEntry[] = []
	const tree = syntaxTree(view.state)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (node.name !== "Link" && node.name !== "WikiLink") return

				const nodeFrom = node.from
				const nodeTo = node.to

				if (isCursorInRange(view.state, nodeFrom, nodeTo)) return

				if (node.name === "Link") {
					const cursor = node.node.cursor()
					if (!cursor.firstChild()) return

					const linkMarks: Array<{ from: number; to: number }> = []
					do {
						if (cursor.name === "LinkMark") {
							linkMarks.push({ from: cursor.from, to: cursor.to })
						}
					} while (cursor.nextSibling())

					if (linkMarks.length < 2) return

					const textStart = linkMarks[0].to
					const textEnd = linkMarks[1].from

					if (textStart >= textEnd) return

					decorations.push({ from: nodeFrom, to: textStart, value: Decoration.replace({}) })
					decorations.push({
						from: textStart,
						to: textEnd,
						value: Decoration.mark({ class: "cm-link" }),
					})
					decorations.push({ from: textEnd, to: nodeTo, value: Decoration.replace({}) })
				}

				if (node.name === "WikiLink") {
					const text = view.state.doc.sliceString(nodeFrom, nodeTo)
					if (text.startsWith("[[") && text.endsWith("]]")) {
						decorations.push({ from: nodeFrom, to: nodeFrom + 2, value: Decoration.replace({}) })
						decorations.push({
							from: nodeFrom + 2,
							to: nodeTo - 2,
							value: Decoration.mark({ class: "cm-wiki-link" }),
						})
						decorations.push({ from: nodeTo - 2, to: nodeTo, value: Decoration.replace({}) })
					}
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

export const linksPlugin = ViewPlugin.fromClass(
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
