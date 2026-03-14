import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view"
import { GITHUB_EMOJI_MAP } from "./emojiMap"

const EMOJI_REGEX = /:([a-z0-9_+-]+):/gi

class EmojiWidget extends WidgetType {
	constructor(private readonly emoji: string) {
		super()
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span")
		span.textContent = this.emoji
		span.className = "cm-emoji-widget"
		return span
	}

	eq(other: EmojiWidget): boolean {
		return other.emoji === this.emoji
	}
}

function buildDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>()
	const { selection } = view.state

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.sliceDoc(from, to)
		EMOJI_REGEX.lastIndex = 0

		for (let match = EMOJI_REGEX.exec(text); match !== null; match = EMOJI_REGEX.exec(text)) {
			const emoji = GITHUB_EMOJI_MAP[match[1].toLowerCase()]
			if (!emoji) continue

			const start = from + match.index
			const end = start + match[0].length

			const cursorOverlaps = selection.ranges.some(
				(range) => range.from <= end && range.to >= start,
			)
			if (cursorOverlaps) continue

			builder.add(start, end, Decoration.replace({ widget: new EmojiWidget(emoji) }))
		}
	}

	return builder.finish()
}

export function emojiExtension() {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view)
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged || update.selectionSet) {
					this.decorations = buildDecorations(update.view)
				}
			}
		},
		{ decorations: (v) => v.decorations },
	)
}
