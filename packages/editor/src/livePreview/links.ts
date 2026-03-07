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
				if (node.name !== "Link" && node.name !== "WikiLink") return

				const nodeFrom = node.from
				const nodeTo = node.to

				if (isCursorInRange(view.state, nodeFrom, nodeTo)) return

				if (node.name === "Link") {
					const linkNode = node.node
					const urlChild = linkNode.getChild("URL")
					const linkText = linkNode.getChild("LinkLabel") ?? linkNode.firstChild

					if (!linkText) return

					builder.add(nodeFrom, linkText.from, Decoration.replace({}))
					builder.add(linkText.from, linkText.to, Decoration.mark({ class: "cm-link" }))
					if (urlChild) {
						builder.add(linkText.to, nodeTo, Decoration.replace({}))
					} else {
						builder.add(linkText.to, nodeTo, Decoration.replace({}))
					}
				}

				if (node.name === "WikiLink") {
					const text = view.state.doc.sliceString(nodeFrom, nodeTo)
					if (text.startsWith("[[") && text.endsWith("]]")) {
						builder.add(nodeFrom, nodeFrom + 2, Decoration.replace({}))
						builder.add(nodeFrom + 2, nodeTo - 2, Decoration.mark({ class: "cm-wiki-link" }))
						builder.add(nodeTo - 2, nodeTo, Decoration.replace({}))
					}
				}
			},
		})
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
