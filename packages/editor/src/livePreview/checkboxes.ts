import { syntaxTree } from "@codemirror/language"
import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view"
import { isCursorInRange } from "./utils"

class CheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly pos: number,
	) {
		super()
	}

	toDOM(view: EditorView) {
		const input = document.createElement("input")
		input.type = "checkbox"
		input.checked = this.checked
		input.className = "cm-checkbox"

		input.addEventListener("mousedown", (e) => {
			e.preventDefault()
			const newState = this.checked ? "[ ]" : "[x]"
			view.dispatch({
				changes: {
					from: this.pos,
					to: this.pos + 3,
					insert: newState,
				},
			})
		})

		return input
	}

	ignoreEvent() {
		return false
	}
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>()
	const tree = syntaxTree(view.state)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (node.name !== "TaskMarker") return

				const markerFrom = node.from
				const markerTo = node.to

				if (isCursorInRange(view.state, markerFrom, markerTo)) return

				const text = view.state.doc.sliceString(markerFrom, markerTo)
				const checked = text === "[x]" || text === "[X]"

				builder.add(
					markerFrom,
					markerTo,
					Decoration.replace({
						widget: new CheckboxWidget(checked, markerFrom),
						side: -1,
					}),
				)
			},
		})
	}

	return builder.finish()
}

export const checkboxesPlugin = ViewPlugin.fromClass(
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
