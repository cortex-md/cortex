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

interface DecorationEntry {
	from: number
	to: number
	value: Decoration
}

class ImageWidget extends WidgetType {
	constructor(
		readonly src: string,
		readonly alt: string,
	) {
		super()
	}

	toDOM() {
		const container = document.createElement("span")
		container.className = "cm-image-container"

		const img = document.createElement("img")
		img.src = this.src
		img.alt = this.alt
		img.className = "cm-image"
		img.onerror = () => {
			img.style.display = "none"
			const fallback = document.createElement("span")
			fallback.className = "cm-image-error"
			fallback.textContent = this.alt ? `Image: ${this.alt}` : "Image not found"
			container.appendChild(fallback)
		}

		container.appendChild(img)
		return container
	}

	eq(other: ImageWidget) {
		return this.src === other.src && this.alt === other.alt
	}

	ignoreEvent() {
		return false
	}
}

function extractImageParts(
	view: EditorView,
	nodeFrom: number,
	nodeTo: number,
): { src: string; alt: string } | null {
	const text = view.state.doc.sliceString(nodeFrom, nodeTo)
	const match = text.match(/^!\[([^\]]*)\]\(([^)]*)\)/)
	if (!match) return null
	return { alt: match[1], src: match[2].split(" ")[0].trim() }
}

function buildDecorations(
	view: EditorView,
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
): DecorationSet {
	const decorations: DecorationEntry[] = []
	const tree = syntaxTree(view.state)

	for (const { from, to } of view.visibleRanges) {
		tree.iterate({
			from,
			to,
			enter(node) {
				if (node.name !== "Image") return

				const nodeFrom = node.from
				const nodeTo = node.to
				const parts = extractImageParts(view, nodeFrom, nodeTo)
				if (!parts) return

				const resolvedSrc = resolveImageUrl(parts.src, filePath)

				decorations.push({
					from: nodeFrom,
					to: nodeTo,
					value: Decoration.replace({
						widget: new ImageWidget(resolvedSrc, parts.alt),
					}),
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

export function imagesPlugin(
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, resolveImageUrl, filePath)
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.selectionSet || update.viewportChanged) {
					this.decorations = buildDecorations(update.view, resolveImageUrl, filePath)
				}
			}
		},
		{
			decorations: (v) => v.decorations,
		},
	)
}
