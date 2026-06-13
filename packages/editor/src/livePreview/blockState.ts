import {
	type EditorSelection,
	type EditorState,
	type Range,
	type RangeSet,
	StateField,
	type Transaction,
} from "@codemirror/state"
import { BlockWrapper, Decoration, type DecorationSet, EditorView } from "@codemirror/view"
import { getCalloutStyleVariables, resolveCalloutType } from "@cortex/renderer"
import { livePreviewRegistryChanged, toggleCalloutCollapsed } from "./effects"
import { recordBlockPass } from "./metrics"
import {
	blockUsesReplacement,
	type CalloutBlock,
	collectMarkdownBlocks,
	createMarkdownBlockIndex,
	type MarkdownBlock,
	type MarkdownBlockIndex,
	selectionOverlapsBlock,
	type TableRowModel,
} from "./model"
import { ImageWidget, TableCellPlaceholderWidget } from "./widgets"

export interface LivePreviewBlockState {
	blocks: MarkdownBlock[]
	index: MarkdownBlockIndex
	replacementBlocks: MarkdownBlock[]
	collapsedCallouts: ReadonlyMap<string, boolean>
	decorations: DecorationSet
	wrappers: RangeSet<BlockWrapper>
	replacementIds: string
}

function addLineDecoration(
	state: EditorState,
	ranges: Range<Decoration>[],
	block: Pick<MarkdownBlock, "firstLine" | "lastLine">,
	decoration: Decoration,
): void {
	for (let lineNumber = block.firstLine; lineNumber <= block.lastLine; lineNumber++) {
		const line = state.doc.line(lineNumber)
		ranges.push(decoration.range(line.from))
	}
}

function calloutLineDecoration(block: CalloutBlock): Decoration {
	const definition = resolveCalloutType(block.callout.type)
	const styles = getCalloutStyleVariables(definition)
	return Decoration.line({
		class: "cm-callout-line",
		attributes: {
			"data-callout": block.callout.type,
			style: `--callout-color: ${styles.color}; --callout-bg: ${styles.backgroundColor}`,
		},
	})
}

function addTableRowDecorations(
	ranges: Range<Decoration>[],
	row: TableRowModel,
	header: boolean,
	columnCount: number,
): void {
	ranges.push(
		Decoration.line({
			class: `cm-table-line cm-table-rendered-line${header ? " cm-table-header-line" : ""}`,
			attributes: { style: `--table-column-count: ${Math.max(columnCount, 1)}` },
		}).range(row.from),
	)

	let syntaxFrom = row.from
	row.cells.forEach((cell, index) => {
		if (syntaxFrom < cell.from) {
			ranges.push(Decoration.replace({}).range(syntaxFrom, cell.from))
		}
		if (cell.from < cell.to) {
			ranges.push(
				Decoration.mark({
					class: "cm-table-cell",
					attributes: { "data-align": cell.alignment },
				}).range(cell.from, cell.to),
			)
		} else {
			ranges.push(
				Decoration.widget({
					widget: new TableCellPlaceholderWidget(cell.alignment),
					side: index,
				}).range(cell.from),
			)
		}
		syntaxFrom = cell.to
	})
	if (syntaxFrom < row.to) {
		ranges.push(Decoration.replace({}).range(syntaxFrom, row.to))
	}
}

function getCalloutCollapsed(
	block: CalloutBlock,
	collapsedCallouts: ReadonlyMap<string, boolean>,
	selection: EditorSelection,
): boolean {
	if (selectionOverlapsBlock(selection, block)) return false
	return collapsedCallouts.get(block.id) ?? block.callout.fold === "collapsed"
}

function createBlockWrapper(
	block: MarkdownBlock,
	collapsedCallouts: ReadonlyMap<string, boolean>,
	selection: EditorSelection,
): BlockWrapper | null {
	if (block.kind === "code") {
		return BlockWrapper.create({
			tagName: "div",
			attributes: {
				class: "cm-markdown-block cm-codeblock-wrapper",
				"data-codeblock-id": block.id,
			},
		})
	}
	if (block.kind === "callout") {
		const definition = resolveCalloutType(block.callout.type)
		const styles = getCalloutStyleVariables(definition)
		const collapsed = getCalloutCollapsed(block, collapsedCallouts, selection)
		return BlockWrapper.create({
			tagName: "div",
			attributes: {
				class: `cm-markdown-block cm-callout-wrapper${collapsed ? " is-collapsed" : ""}`,
				"data-callout": block.callout.type,
				style: `--callout-color: ${styles.color}; --callout-bg: ${styles.backgroundColor}`,
			},
		})
	}
	if (block.kind === "blockquote") {
		return BlockWrapper.create({
			tagName: "div",
			attributes: { class: "cm-markdown-block cm-blockquote-wrapper" },
		})
	}
	if (block.kind === "table") {
		return BlockWrapper.create({
			tagName: "div",
			attributes: { class: "cm-markdown-block cm-table-wrapper" },
		})
	}
	if (block.kind === "frontmatter") {
		return BlockWrapper.create({
			tagName: "div",
			attributes: { class: "cm-markdown-block cm-frontmatter-wrapper" },
		})
	}
	return null
}

function buildWrappers(
	blocks: MarkdownBlock[],
	collapsedCallouts: ReadonlyMap<string, boolean>,
	selection: EditorSelection,
): RangeSet<BlockWrapper> {
	const ranges: Range<BlockWrapper>[] = []
	for (const block of blocks) {
		const wrapper = createBlockWrapper(block, collapsedCallouts, selection)
		if (wrapper) ranges.push(wrapper.range(block.from, block.to))
	}
	return BlockWrapper.set(ranges, true)
}

function buildDecorations(
	state: EditorState,
	blocks: MarkdownBlock[],
	collapsedCallouts: ReadonlyMap<string, boolean>,
): DecorationSet {
	const ranges: Range<Decoration>[] = []

	for (const block of blocks) {
		const selected = selectionOverlapsBlock(state.selection, block)
		const replaced = blockUsesReplacement(block, collapsedCallouts, state.selection)

		if (block.kind === "heading") {
			ranges.push(Decoration.line({ class: `cm-h${block.level}` }).range(block.from))
			continue
		}
		if (block.kind === "blockquote") {
			addLineDecoration(state, ranges, block, Decoration.line({ class: "cm-blockquote" }))
			continue
		}
		if (block.kind === "horizontalRule") {
			if (replaced) {
				ranges.push(Decoration.line({ class: "cm-horizontal-rule-line" }).range(block.from))
				ranges.push(Decoration.replace({}).range(block.from, block.to))
			}
			continue
		}
		if (block.kind === "code") {
			addLineDecoration(
				state,
				ranges,
				block,
				Decoration.line({
					class: "cm-codeblock-line",
					attributes: { "data-codeblock-id": block.id },
				}),
			)
			if (!selected) {
				ranges.push(Decoration.replace({}).range(block.openFenceFrom, block.openFenceTo))
				ranges.push(Decoration.replace({}).range(block.closeFenceFrom, block.closeFenceTo))
			}
			continue
		}
		if (block.kind === "callout") {
			addLineDecoration(state, ranges, block, calloutLineDecoration(block))
			continue
		}
		if (block.kind === "table") {
			if (selected) {
				addLineDecoration(
					state,
					ranges,
					block,
					Decoration.line({ class: "cm-table-line cm-table-source-line" }),
				)
			} else {
				addTableRowDecorations(ranges, block.table.header, true, block.table.columnCount)
				ranges.push(
					Decoration.line({
						class: "cm-table-line cm-table-delimiter-line",
					}).range(block.table.delimiter.from),
				)
				ranges.push(
					Decoration.mark({ class: "cm-table-delimiter-source" }).range(
						block.table.delimiter.from,
						block.table.delimiter.to,
					),
				)
				for (const row of block.table.rows) {
					addTableRowDecorations(ranges, row, false, block.table.columnCount)
				}
			}
			continue
		}
		if (block.kind === "frontmatter") {
			addLineDecoration(state, ranges, block, Decoration.line({ class: "cm-frontmatter-line" }))
			continue
		}
		if (block.kind === "image" && replaced) {
			ranges.push(
				Decoration.replace({ widget: new ImageWidget(block) }).range(block.from, block.to),
			)
		}
	}

	return Decoration.set(ranges, true)
}

function getReplacementIds(
	blocks: MarkdownBlock[],
	collapsedCallouts: ReadonlyMap<string, boolean>,
	selection: EditorSelection,
): string {
	const ids: string[] = []
	for (const block of blocks) {
		if (blockUsesReplacement(block, collapsedCallouts, selection)) {
			ids.push(`${block.id}:replaced`)
		}
		if (block.kind === "callout" && getCalloutCollapsed(block, collapsedCallouts, selection)) {
			ids.push(`${block.id}:collapsed`)
		}
		if (block.kind === "code" && selectionOverlapsBlock(selection, block)) {
			ids.push(`${block.id}:source`)
		}
		if (block.kind === "table" && selectionOverlapsBlock(selection, block)) {
			ids.push(`${block.id}:source`)
		}
	}
	return ids.join("|")
}

function createBlockState(
	state: EditorState,
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
	collapsedCallouts: ReadonlyMap<string, boolean> = new Map(),
): LivePreviewBlockState {
	recordBlockPass()
	const blocks = collectMarkdownBlocks(state, resolveImageUrl, filePath)
	const index = createMarkdownBlockIndex(blocks)
	const replacementBlocks = blocks.filter((block) =>
		blockUsesReplacement(block, collapsedCallouts, state.selection),
	)
	const replacementIds = getReplacementIds(blocks, collapsedCallouts, state.selection)
	return {
		blocks,
		index,
		replacementBlocks,
		collapsedCallouts,
		replacementIds,
		decorations: buildDecorations(state, blocks, collapsedCallouts),
		wrappers: buildWrappers(blocks, collapsedCallouts, state.selection),
	}
}

function mapCollapsedCallouts(
	value: LivePreviewBlockState,
	transaction: Transaction,
): ReadonlyMap<string, boolean> {
	const mapped = new Map<string, boolean>()
	for (const block of value.blocks) {
		if (block.kind !== "callout") continue
		const collapsed = value.collapsedCallouts.get(block.id)
		if (collapsed === undefined) continue
		mapped.set(`callout:${transaction.changes.mapPos(block.from, 1)}`, collapsed)
	}
	return mapped
}

export function createLivePreviewBlockField(
	resolveImageUrl: (src: string, filePath: string) => string,
	filePath: string,
) {
	return StateField.define<LivePreviewBlockState>({
		create(state) {
			return createBlockState(state, resolveImageUrl, filePath)
		},
		update(value, transaction) {
			if (transaction.docChanged) {
				return createBlockState(
					transaction.state,
					resolveImageUrl,
					filePath,
					mapCollapsedCallouts(value, transaction),
				)
			}

			const registryChanged = transaction.effects.some((effect) =>
				effect.is(livePreviewRegistryChanged),
			)
			const toggledCallout = transaction.effects.find((effect) => effect.is(toggleCalloutCollapsed))
			let collapsedCallouts = value.collapsedCallouts
			if (toggledCallout) {
				const block = value.blocks.find(
					(candidate) => candidate.kind === "callout" && candidate.id === toggledCallout.value,
				) as CalloutBlock | undefined
				if (block) {
					const next = new Map(collapsedCallouts)
					const current = next.get(block.id) ?? block.callout.fold === "collapsed"
					next.set(block.id, !current)
					collapsedCallouts = next
				}
			}

			const replacementIds = getReplacementIds(
				value.blocks,
				collapsedCallouts,
				transaction.state.selection,
			)
			if (!registryChanged && !toggledCallout && replacementIds === value.replacementIds) {
				return value
			}

			return {
				...value,
				collapsedCallouts,
				replacementIds,
				replacementBlocks: value.blocks.filter((block) =>
					blockUsesReplacement(block, collapsedCallouts, transaction.state.selection),
				),
				decorations: buildDecorations(transaction.state, value.blocks, collapsedCallouts),
				wrappers: buildWrappers(value.blocks, collapsedCallouts, transaction.state.selection),
			}
		},
		provide(field) {
			return [
				EditorView.decorations.from(field, (value) => value.decorations),
				EditorView.blockWrappers.from(field, (value) => value.wrappers),
			]
		},
	})
}
