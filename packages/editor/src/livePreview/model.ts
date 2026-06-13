import { syntaxTree } from "@codemirror/language"
import type { EditorSelection, EditorState } from "@codemirror/state"
import {
	type ParsedCallout,
	parseCallout,
	parseCalloutMarker,
	parseFrontmatter,
} from "@cortex/renderer"
import { createInlineSnapshot, type InlineSnapshot } from "./inlineTree"

interface SyntaxNodeLike {
	name: string
	from: number
	to: number
	firstChild: SyntaxNodeLike | null
	nextSibling: SyntaxNodeLike | null
}

interface BaseBlock {
	id: string
	from: number
	to: number
	firstLine: number
	lastLine: number
}

export interface TableModel {
	headers: InlineSnapshot[]
	rows: InlineSnapshot[][]
	alignments: Array<"left" | "center" | "right">
}

export interface TableBlock extends BaseBlock {
	kind: "table"
	table: TableModel
}

export interface FrontmatterBlock extends BaseBlock {
	kind: "frontmatter"
}

export interface ImageBlock extends BaseBlock {
	kind: "image"
	src: string
	alt: string
}

export interface CalloutBlock extends BaseBlock {
	kind: "callout"
	callout: ParsedCallout
	titleFrom: number
}

export interface CodeBlock extends BaseBlock {
	kind: "code"
	language: string
	code: string
	openFenceFrom: number
	openFenceTo: number
	closeFenceFrom: number
	closeFenceTo: number
}

export interface HeadingBlock extends BaseBlock {
	kind: "heading"
	level: number
}

export interface BlockquoteBlock extends BaseBlock {
	kind: "blockquote"
}

export interface HorizontalRuleBlock extends BaseBlock {
	kind: "horizontalRule"
}

export type MarkdownBlock =
	| TableBlock
	| FrontmatterBlock
	| ImageBlock
	| CalloutBlock
	| CodeBlock
	| HeadingBlock
	| BlockquoteBlock
	| HorizontalRuleBlock

export interface MarkdownBlockIndex {
	all: MarkdownBlock[]
	callouts: CalloutBlock[]
	blockquotes: BlockquoteBlock[]
	code: CodeBlock[]
}

const headingLevels: Record<string, number> = {
	ATXHeading1: 1,
	ATXHeading2: 2,
	ATXHeading3: 3,
	ATXHeading4: 4,
	ATXHeading5: 5,
	ATXHeading6: 6,
}

function createBaseBlock(
	state: EditorState,
	kind: MarkdownBlock["kind"],
	from: number,
	to: number,
): BaseBlock {
	const first = state.doc.lineAt(from)
	const adjustedTo = to > from && state.doc.sliceString(to - 1, to) === "\n" ? to - 1 : to
	const last = state.doc.lineAt(adjustedTo)
	return {
		id: `${kind}:${first.from}`,
		from: first.from,
		to: last.to,
		firstLine: first.number,
		lastLine: last.number,
	}
}

function childNodes(node: SyntaxNodeLike, name: string): SyntaxNodeLike[] {
	const children: SyntaxNodeLike[] = []
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name === name) children.push(child)
	}
	return children
}

function parseAlignment(value: string): "left" | "center" | "right" {
	const trimmed = value.trim()
	if (trimmed.startsWith(":") && trimmed.endsWith(":")) return "center"
	if (trimmed.endsWith(":")) return "right"
	return "left"
}

function createTableModel(state: EditorState, node: SyntaxNodeLike): TableModel {
	const header = childNodes(node, "TableHeader")[0]
	const rows = childNodes(node, "TableRow")
	const delimiter = childNodes(node, "TableDelimiter")[0]
	const delimiterSource = delimiter ? state.doc.sliceString(delimiter.from, delimiter.to) : ""
	const alignments = delimiterSource
		.replace(/^\s*\|?|\|?\s*$/g, "")
		.split("|")
		.map(parseAlignment)

	return {
		headers: header
			? childNodes(header, "TableCell").map((cell) => createInlineSnapshot(state, cell))
			: [],
		rows: rows.map((row) =>
			childNodes(row, "TableCell").map((cell) => createInlineSnapshot(state, cell)),
		),
		alignments,
	}
}

function createCalloutBlock(state: EditorState, node: SyntaxNodeLike): CalloutBlock | null {
	const base = createBaseBlock(state, "callout", node.from, node.to)
	const source = state.doc.sliceString(base.from, base.to)
	const callout = parseCallout(source)
	if (!callout) return null

	const firstLine = state.doc.line(base.firstLine)
	const marker = parseCalloutMarker(firstLine.text)
	const titleFrom = marker ? firstLine.from + marker.markerLength : firstLine.to
	return {
		...base,
		kind: "callout",
		callout,
		titleFrom,
	}
}

function createCodeBlock(state: EditorState, node: SyntaxNodeLike): CodeBlock {
	const base = createBaseBlock(state, "code", node.from, node.to)
	const firstLine = state.doc.line(base.firstLine)
	const lastLine = state.doc.line(base.lastLine)
	const info = childNodes(node, "CodeInfo")[0]
	const code = childNodes(node, "CodeText")
		.map((child) => state.doc.sliceString(child.from, child.to))
		.join("")

	return {
		...base,
		kind: "code",
		language: info ? state.doc.sliceString(info.from, info.to).trim() : "",
		code,
		openFenceFrom: firstLine.from,
		openFenceTo: firstLine.to,
		closeFenceFrom: lastLine.from,
		closeFenceTo: lastLine.to,
	}
}

function createImageBlock(
	state: EditorState,
	node: SyntaxNodeLike,
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
): ImageBlock | null {
	const source = state.doc.sliceString(node.from, node.to)
	const match = source.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)$/)
	if (!match) return null
	const base = createBaseBlock(state, "image", node.from, node.to)
	return {
		...base,
		id: `image:${node.from}`,
		from: node.from,
		to: node.to,
		kind: "image",
		alt: match[1],
		src: resolveImageUrl(match[2], filePath),
	}
}

export function collectMarkdownBlocks(
	state: EditorState,
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
): MarkdownBlock[] {
	const blocks: MarkdownBlock[] = []
	const frontmatter = parseFrontmatter(state.doc.toString())
	if (frontmatter) {
		const base = createBaseBlock(state, "frontmatter", frontmatter.from, frontmatter.to)
		blocks.push({ ...base, kind: "frontmatter" })
	}

	syntaxTree(state).iterate({
		enter(nodeRef) {
			const node = nodeRef.node as SyntaxNodeLike
			const headingLevel = headingLevels[node.name]
			if (headingLevel) {
				const base = createBaseBlock(state, "heading", node.from, node.to)
				blocks.push({ ...base, kind: "heading", level: headingLevel })
				return
			}
			if (node.name === "Table") {
				const base = createBaseBlock(state, "table", node.from, node.to)
				blocks.push({ ...base, kind: "table", table: createTableModel(state, node) })
				return false
			}
			if (node.name === "FencedCode") {
				blocks.push(createCodeBlock(state, node))
				return false
			}
			if (node.name === "Blockquote") {
				const callout = createCalloutBlock(state, node)
				if (callout) blocks.push(callout)
				else {
					const base = createBaseBlock(state, "blockquote", node.from, node.to)
					blocks.push({ ...base, kind: "blockquote" })
				}
				return false
			}
			if (node.name === "HorizontalRule") {
				const base = createBaseBlock(state, "horizontalRule", node.from, node.to)
				if (!frontmatter || base.from >= frontmatter.to) {
					blocks.push({ ...base, kind: "horizontalRule" })
				}
				return false
			}
			if (node.name === "Image") {
				const image = createImageBlock(state, node, resolveImageUrl, filePath)
				if (image) blocks.push(image)
				return false
			}
		},
	})

	return blocks.sort((left, right) => left.from - right.from || left.to - right.to)
}

export function createMarkdownBlockIndex(blocks: MarkdownBlock[]): MarkdownBlockIndex {
	return {
		all: blocks,
		callouts: blocks.filter((block): block is CalloutBlock => block.kind === "callout"),
		blockquotes: blocks.filter((block): block is BlockquoteBlock => block.kind === "blockquote"),
		code: blocks.filter((block): block is CodeBlock => block.kind === "code"),
	}
}

export function findBlocksInRange<T extends Pick<MarkdownBlock, "from" | "to">>(
	blocks: readonly T[],
	from: number,
	to: number,
): T[] {
	let low = 0
	let high = blocks.length
	while (low < high) {
		const middle = Math.floor((low + high) / 2)
		if (blocks[middle].from < from) low = middle + 1
		else high = middle
	}
	const matches: T[] = []
	for (let index = Math.max(0, low - 1); index < blocks.length; index++) {
		const block = blocks[index]
		if (block.from > to) break
		if (block.to >= from) matches.push(block)
	}
	return matches
}

export function findBlockContainingRange<T extends Pick<MarkdownBlock, "from" | "to">>(
	blocks: readonly T[],
	from: number,
	to: number,
): T | undefined {
	let low = 0
	let high = blocks.length - 1
	let candidate: T | undefined
	while (low <= high) {
		const middle = Math.floor((low + high) / 2)
		const block = blocks[middle]
		if (block.from <= from) {
			candidate = block
			low = middle + 1
		} else {
			high = middle - 1
		}
	}
	return candidate && to <= candidate.to ? candidate : undefined
}

export function selectionOverlapsBlock(
	selection: EditorSelection,
	block: Pick<MarkdownBlock, "from" | "to">,
): boolean {
	return selection.ranges.some((range) => range.from <= block.to && range.to >= block.from)
}

export function blockUsesReplacement(
	block: MarkdownBlock,
	_collapsedCallouts: ReadonlyMap<string, boolean>,
	selection: EditorSelection,
): boolean {
	if (selectionOverlapsBlock(selection, block)) return false
	return block.kind === "table" || block.kind === "image" || block.kind === "horizontalRule"
}
