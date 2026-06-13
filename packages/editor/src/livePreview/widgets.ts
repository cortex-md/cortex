import { type EditorView, WidgetType } from "@codemirror/view"
import { type MarkdownPortableNode, sanitizeMarkdownUrl } from "@cortex/renderer"
import { toggleCalloutCollapsed } from "./effects"
import { renderInlineSnapshot } from "./inlineTree"
import type { ImageBlock, TableBlock } from "./model"

function revealSource(view: EditorView, from: number): void {
	view.dispatch({ selection: { anchor: from } })
	view.focus()
}

export class TextWidget extends WidgetType {
	constructor(
		readonly text: string,
		readonly className = "",
	) {
		super()
	}

	toDOM() {
		const span = document.createElement("span")
		span.textContent = this.text
		span.className = this.className
		return span
	}

	eq(other: TextWidget) {
		return other.text === this.text && other.className === this.className
	}
}

function appendPortableNodes(parent: HTMLElement, nodes: readonly MarkdownPortableNode[]): void {
	for (const node of nodes) {
		if (node.type === "text") {
			parent.appendChild(document.createTextNode(node.value))
			continue
		}
		if (node.type === "container" || node.type === "span") {
			const span = document.createElement("span")
			if (node.type === "container") span.className = "markdown-semantic-container"
			else if (node.className) span.className = node.className
			appendPortableNodes(span, node.children)
			parent.appendChild(span)
			continue
		}
		if (node.type === "link") {
			const link = document.createElement("a")
			const href = sanitizeMarkdownUrl(node.href, "link")
			if (href) link.href = href
			appendPortableNodes(link, node.children)
			parent.appendChild(link)
			continue
		}
		if (node.type === "image") {
			const image = document.createElement("img")
			const src = sanitizeMarkdownUrl(node.src, "image")
			if (src) image.src = src
			image.alt = node.alt
			parent.appendChild(image)
			continue
		}
		const code = document.createElement("code")
		code.textContent = node.value
		if (node.language) code.className = `language-${node.language}`
		parent.appendChild(code)
	}
}

export class PortableNodeWidget extends WidgetType {
	constructor(readonly nodes: readonly MarkdownPortableNode[]) {
		super()
	}

	toDOM() {
		const span = document.createElement("span")
		span.className = "markdown-semantic-widget"
		appendPortableNodes(span, this.nodes)
		return span
	}

	eq(other: PortableNodeWidget) {
		return JSON.stringify(other.nodes) === JSON.stringify(this.nodes)
	}
}

export class CheckboxWidget extends WidgetType {
	constructor(
		readonly checked: boolean,
		readonly from: number,
	) {
		super()
	}

	toDOM(view: EditorView) {
		const input = document.createElement("input")
		input.type = "checkbox"
		input.checked = this.checked
		input.className = "cm-checkbox"
		input.addEventListener("pointerdown", (event) => {
			event.preventDefault()
			event.stopPropagation()
			view.dispatch({
				changes: {
					from: this.from,
					to: this.from + 3,
					insert: this.checked ? "[ ]" : "[x]",
				},
			})
		})
		return input
	}

	ignoreEvent() {
		return true
	}
}

export class TableRowWidget extends WidgetType {
	constructor(
		readonly cells: TableBlock["table"]["headers"],
		readonly alignments: TableBlock["table"]["alignments"],
		readonly header: boolean,
	) {
		super()
	}

	toDOM() {
		const row = document.createElement("span")
		row.className = `cm-table-row-widget${this.header ? " is-header" : ""}`
		row.style.setProperty("--table-column-count", String(Math.max(this.cells.length, 1)))
		this.cells.forEach((snapshot, index) => {
			const cell = document.createElement("span")
			cell.className = "cm-table-cell-widget"
			cell.dataset.align = this.alignments[index] ?? "left"
			renderInlineSnapshot(cell, snapshot)
			row.appendChild(cell)
		})
		return row
	}

	eq(other: TableRowWidget) {
		return (
			other.header === this.header &&
			JSON.stringify(other.cells) === JSON.stringify(this.cells) &&
			other.alignments.join("|") === this.alignments.join("|")
		)
	}
}

export class TableDelimiterWidget extends WidgetType {
	constructor(readonly columnCount: number) {
		super()
	}

	toDOM() {
		const row = document.createElement("span")
		row.className = "cm-table-delimiter-widget"
		row.style.setProperty("--table-column-count", String(Math.max(this.columnCount, 1)))
		for (let index = 0; index < this.columnCount; index++) {
			const cell = document.createElement("span")
			cell.className = "cm-table-delimiter-cell"
			row.appendChild(cell)
		}
		return row
	}

	eq(other: TableDelimiterWidget) {
		return other.columnCount === this.columnCount
	}
}

export class ImageWidget extends WidgetType {
	constructor(readonly block: ImageBlock) {
		super()
	}

	toDOM(view: EditorView) {
		const container = document.createElement("span")
		container.className = "cm-image-container"
		const image = document.createElement("img")
		image.src = this.block.src
		image.alt = this.block.alt
		image.className = "cm-image"
		image.addEventListener("error", () => {
			image.hidden = true
			const fallback = document.createElement("span")
			fallback.className = "cm-image-error"
			fallback.textContent = this.block.alt ? `Image: ${this.block.alt}` : "Image not found"
			container.appendChild(fallback)
		})
		container.appendChild(image)
		container.addEventListener("pointerdown", (event) => {
			event.preventDefault()
			revealSource(view, this.block.from)
		})
		return container
	}

	eq(other: ImageWidget) {
		return other.block.src === this.block.src && other.block.alt === this.block.alt
	}

	ignoreEvent() {
		return true
	}
}

export class CalloutFoldWidget extends WidgetType {
	constructor(readonly blockId: string) {
		super()
	}

	toDOM(view: EditorView) {
		const button = document.createElement("button")
		button.type = "button"
		button.className = "markdown-callout-fold"
		button.dataset.calloutToggle = "true"
		button.setAttribute("aria-label", "Collapse callout")
		button.setAttribute("aria-expanded", "true")
		const preserveSelection = (event: Event) => {
			event.preventDefault()
			event.stopPropagation()
		}
		button.addEventListener("pointerdown", preserveSelection)
		button.addEventListener("mousedown", preserveSelection)
		button.addEventListener("click", (event) => {
			preserveSelection(event)
			view.dispatch({ effects: toggleCalloutCollapsed.of(this.blockId) })
		})
		return button
	}

	eq(other: CalloutFoldWidget) {
		return other.blockId === this.blockId
	}

	ignoreEvent() {
		return true
	}
}

export class CopyButtonWidget extends WidgetType {
	constructor(
		readonly code: string,
		readonly blockId: string,
		readonly visible: boolean,
	) {
		super()
	}

	toDOM() {
		const button = document.createElement("button")
		button.type = "button"
		button.className = "cm-codeblock-copy"
		button.textContent = "Copy"
		button.title = "Copy code"
		button.dataset.codeblockId = this.blockId
		button.dataset.controlsVisible = String(this.visible)
		const preserveSelection = (event: Event) => {
			event.preventDefault()
			event.stopPropagation()
		}
		button.addEventListener("pointerdown", preserveSelection)
		button.addEventListener("mousedown", preserveSelection)
		button.addEventListener("click", async (event) => {
			preserveSelection(event)
			try {
				await navigator.clipboard.writeText(this.code)
				button.textContent = "Copied!"
				button.classList.add("copied")
				setTimeout(() => {
					button.textContent = "Copy"
					button.classList.remove("copied")
				}, 2000)
			} catch {
				button.textContent = "Copy"
			}
		})
		return button
	}

	eq(other: CopyButtonWidget) {
		return (
			other.code === this.code && other.blockId === this.blockId && other.visible === this.visible
		)
	}

	ignoreEvent() {
		return true
	}
}
