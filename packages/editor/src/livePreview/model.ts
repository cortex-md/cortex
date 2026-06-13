import { syntaxTree } from "@codemirror/language"
import type { EditorSelection, EditorState } from "@codemirror/state"
import {
	type ParsedCallout,
	parseCallout,
	parseCalloutMarker,
	parseFrontmatter,
} from "@cortex/renderer"

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

interface SourceRange {
	from: number
	to: number
}

export interface TableCellModel extends SourceRange {
	alignment: "left" | "center" | "right"
}

export interface TableRowModel extends SourceRange {
	cells: TableCellModel[]
}

export interface TableModel {
	header: TableRowModel
	delimiter: SourceRange
	rows: TableRowModel[]
	columnCount: number
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
	tables: TableBlock[]
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

function trimCellRange(state: EditorState, from: number, to: number): SourceRange {
	const source = state.sliceDoc(from, to)
	const leadingWhitespace = source.length - source.trimStart().length
	const trailingWhitespace = source.length - source.trimEnd().length
	const contentFrom = from + leadingWhitespace
	return {
		from: contentFrom,
		to: Math.max(contentFrom, to - trailingWhitespace),
	}
}

function createTableRowModel(
	state: EditorState,
	node: SyntaxNodeLike,
	alignments: TableCellModel["alignment"][],
): TableRowModel {
	const delimiters = childNodes(node, "TableDelimiter")
	const leadingDelimiter = delimiters[0]?.from === node.from
	const trailingDelimiter = delimiters.at(-1)?.to === node.to
	const segmentRanges: SourceRange[] = []
	let segmentFrom = leadingDelimiter ? delimiters[0].to : node.from
	const lastDelimiterIndex = trailingDelimiter ? delimiters.length - 1 : delimiters.length

	for (
		let delimiterIndex = leadingDelimiter ? 1 : 0;
		delimiterIndex < lastDelimiterIndex;
		delimiterIndex++
	) {
		const delimiter = delimiters[delimiterIndex]
		segmentRanges.push(trimCellRange(state, segmentFrom, delimiter.from))
		segmentFrom = delimiter.to
	}

	const segmentTo = trailingDelimiter ? delimiters.at(-1)?.from : node.to
	if (segmentTo !== undefined) {
		segmentRanges.push(trimCellRange(state, segmentFrom, segmentTo))
	}

	const columnCount = Math.max(alignments.length, segmentRanges.length)
	const cells = Array.from({ length: columnCount }, (_, index) => {
		const range = segmentRanges[index] ?? { from: node.to, to: node.to }
		return {
			...range,
			alignment: alignments[index] ?? "left",
		}
	})

	return { from: node.from, to: node.to, cells }
}

function createTableModel(state: EditorState, node: SyntaxNodeLike): TableModel {
	const header = childNodes(node, "TableHeader")[0]
	const rows = childNodes(node, "TableRow")
	const delimiter = childNodes(node, "TableDelimiter")[0]
	if (!header || !delimiter) {
		const emptyRow = { from: node.from, to: node.from, cells: [] }
		return {
			header: emptyRow,
			delimiter: { from: node.from, to: node.from },
			rows: [],
			columnCount: 0,
		}
	}
	const delimiterSource = state.doc.sliceString(delimiter.from, delimiter.to)
	const alignments = delimiterSource
		.replace(/^\s*\|?|\|?\s*$/g, "")
		.split("|")
		.map(parseAlignment)

	return {
		header: createTableRowModel(state, header, alignments),
		delimiter: { from: delimiter.from, to: delimiter.to },
		rows: rows.map((row) => createTableRowModel(state, row, alignments)),
		columnCount: alignments.length,
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
		tables: blocks.filter((block): block is TableBlock => block.kind === "table"),
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
	return block.kind === "image" || block.kind === "horizontalRule"
}
