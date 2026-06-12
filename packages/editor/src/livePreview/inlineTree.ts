import type { EditorState } from "@codemirror/state"

interface SyntaxNodeLike {
	name: string
	from: number
	to: number
	firstChild: SyntaxNodeLike | null
	nextSibling: SyntaxNodeLike | null
}

export interface InlineNode {
	name: string
	from: number
	to: number
	children: InlineNode[]
}

export interface InlineSnapshot {
	source: string
	nodes: InlineNode[]
}

function snapshotNode(node: SyntaxNodeLike, offset: number): InlineNode {
	const children: InlineNode[] = []
	for (let child = node.firstChild; child; child = child.nextSibling) {
		children.push(snapshotNode(child, offset))
	}
	return {
		name: node.name,
		from: node.from - offset,
		to: node.to - offset,
		children,
	}
}

export function createInlineSnapshot(
	state: EditorState,
	node: SyntaxNodeLike,
	from = node.from,
	to = node.to,
): InlineSnapshot {
	const nodes: InlineNode[] = []
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.from >= from && child.to <= to) {
			nodes.push(snapshotNode(child, from))
		}
	}
	return {
		source: state.doc.sliceString(from, to),
		nodes,
	}
}

function appendText(parent: HTMLElement, text: string): void {
	if (text) parent.appendChild(document.createTextNode(text))
}

function renderNodeRange(
	parent: HTMLElement,
	snapshot: InlineSnapshot,
	nodes: InlineNode[],
	from: number,
	to: number,
): void {
	let position = from
	for (const node of nodes) {
		if (node.from < from || node.to > to) continue
		appendText(parent, snapshot.source.slice(position, node.from))
		renderInlineNode(parent, snapshot, node)
		position = node.to
	}
	appendText(parent, snapshot.source.slice(position, to))
}

function renderWrappedNode(
	parent: HTMLElement,
	snapshot: InlineSnapshot,
	node: InlineNode,
	tagName: "strong" | "em" | "del",
): void {
	const element = document.createElement(tagName)
	renderNodeRange(element, snapshot, node.children, node.from, node.to)
	parent.appendChild(element)
}

function renderInlineCode(parent: HTMLElement, snapshot: InlineSnapshot, node: InlineNode): void {
	const marks = node.children.filter((child) => child.name === "CodeMark")
	const code = document.createElement("code")
	code.textContent = snapshot.source.slice(marks[0]?.to ?? node.from, marks.at(-1)?.from ?? node.to)
	parent.appendChild(code)
}

function renderLink(parent: HTMLElement, snapshot: InlineSnapshot, node: InlineNode): void {
	const marks = node.children.filter((child) => child.name === "LinkMark")
	const url = node.children.find((child) => child.name === "URL")
	if (marks.length < 2 || !url) {
		appendText(parent, snapshot.source.slice(node.from, node.to))
		return
	}

	const link = document.createElement("a")
	link.href = snapshot.source.slice(url.from, url.to)
	link.className = "markdown-link"
	renderNodeRange(link, snapshot, node.children, marks[0].to, marks[1].from)
	parent.appendChild(link)
}

function renderInlineNode(parent: HTMLElement, snapshot: InlineSnapshot, node: InlineNode): void {
	if (
		node.name === "CodeMark" ||
		node.name === "EmphasisMark" ||
		node.name === "LinkMark" ||
		node.name === "StrikethroughMark" ||
		node.name === "URL"
	) {
		return
	}
	if (node.name === "StrongEmphasis") {
		renderWrappedNode(parent, snapshot, node, "strong")
		return
	}
	if (node.name === "Emphasis") {
		renderWrappedNode(parent, snapshot, node, "em")
		return
	}
	if (node.name === "Strikethrough") {
		renderWrappedNode(parent, snapshot, node, "del")
		return
	}
	if (node.name === "InlineCode") {
		renderInlineCode(parent, snapshot, node)
		return
	}
	if (node.name === "Link") {
		renderLink(parent, snapshot, node)
		return
	}
	if (node.name === "Escape") {
		appendText(parent, snapshot.source.slice(node.from + 1, node.to))
		return
	}
	if (node.name === "HardBreak") {
		parent.appendChild(document.createElement("br"))
		return
	}
	if (node.children.length > 0) {
		renderNodeRange(parent, snapshot, node.children, node.from, node.to)
		return
	}
	appendText(parent, snapshot.source.slice(node.from, node.to))
}

export function renderInlineSnapshot(parent: HTMLElement, snapshot: InlineSnapshot): void {
	renderNodeRange(parent, snapshot, snapshot.nodes, 0, snapshot.source.length)
}
