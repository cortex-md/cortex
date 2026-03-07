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

interface DecorationEntry {
	from: number
	to: number
	value: Decoration
}

class LanguageBadgeWidget extends WidgetType {
	constructor(
		readonly language: string,
		readonly cursorInBlock: boolean,
	) {
		super()
	}

	toDOM() {
		const span = document.createElement("span")
		span.className = "cm-codeblock-lang"
		span.textContent = this.language
		span.setAttribute("data-cursor-in-block", String(this.cursorInBlock))
		return span
	}

	eq(other: LanguageBadgeWidget) {
		return other.language === this.language && other.cursorInBlock === this.cursorInBlock
	}

	ignoreEvent() {
		return true
	}
}

class CopyButtonWidget extends WidgetType {
	constructor(
		readonly code: string,
		readonly cursorInBlock: boolean,
	) {
		super()
	}

	toDOM() {
		const button = document.createElement("button")
		button.className = "cm-codeblock-copy"
		button.textContent = "Copy"
		button.type = "button"
		button.title = "Copy code"
		button.setAttribute("data-cursor-in-block", String(this.cursorInBlock))

		button.addEventListener("click", (e) => {
			e.preventDefault()
			e.stopPropagation()
			navigator.clipboard.writeText(this.code)
			button.textContent = "Copied!"
			button.classList.add("copied")
			setTimeout(() => {
				button.textContent = "Copy"
				button.classList.remove("copied")
			}, 2000)
		})

		return button
	}

	eq(other: CopyButtonWidget) {
		return other.code === this.code && other.cursorInBlock === this.cursorInBlock
	}

	ignoreEvent() {
		return false
	}
}

function buildDecorations(view: EditorView): DecorationSet {
	const decorations: DecorationEntry[] = []
	const tree = syntaxTree(view.state)
	const codeBlockLineDeco = Decoration.line({ class: "cm-codeblock-line" })

	tree.iterate({
		enter(node) {
			if (node.name !== "FencedCode") return

			const nodeFrom = node.from
			const nodeTo = node.to
			const cursorInBlock = isCursorInRange(view.state, nodeFrom, nodeTo)

			const firstLine = view.state.doc.lineAt(nodeFrom)
			const lastLine = view.state.doc.lineAt(nodeTo)

			for (let pos = nodeFrom; pos <= nodeTo; ) {
				const line = view.state.doc.lineAt(pos)
				decorations.push({ from: line.from, to: line.from, value: codeBlockLineDeco })
				if (line.to >= nodeTo) break
				pos = line.to + 1
			}

			const codeInfoNode = node.node.getChild("CodeInfo")
			const language = codeInfoNode
				? view.state.doc.sliceString(codeInfoNode.from, codeInfoNode.to).trim()
				: ""

			const codeLines: string[] = []
			for (let lineNum = firstLine.number + 1; lineNum < lastLine.number; lineNum++) {
				codeLines.push(view.state.doc.line(lineNum).text)
			}
			const codeContent = codeLines.join("\n")

			const widgetPos = codeInfoNode ? codeInfoNode.to : firstLine.from + 3

			if (language) {
				decorations.push({
					from: widgetPos,
					to: widgetPos,
					value: Decoration.widget({
						widget: new LanguageBadgeWidget(language, cursorInBlock),
						side: 1,
					}),
				})
			}

			decorations.push({
				from: widgetPos,
				to: widgetPos,
				value: Decoration.widget({
					widget: new CopyButtonWidget(codeContent, cursorInBlock),
					side: 1,
				}),
			})

			if (!cursorInBlock) {
				decorations.push({
					from: firstLine.from,
					to: firstLine.to,
					value: Decoration.replace({}),
				})
				decorations.push({
					from: lastLine.from,
					to: lastLine.to,
					value: Decoration.replace({}),
				})
			}
		},
	})

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

export const codeBlockPlugin = ViewPlugin.fromClass(
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
