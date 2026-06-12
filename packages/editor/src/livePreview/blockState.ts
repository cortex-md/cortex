import {
	type EditorSelection,
	type EditorState,
	type Range,
	StateField,
	type Transaction,
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view"
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
} from "./model"
import {
	CollapsedCalloutWidget,
	FrontmatterWidget,
	HorizontalRuleWidget,
	ImageWidget,
	TableWidget,
} from "./widgets"

export interface LivePreviewBlockState {
	blocks: MarkdownBlock[]
	index: MarkdownBlockIndex
	replacementBlocks: MarkdownBlock[]
	collapsedCallouts: ReadonlyMap<string, boolean>
	decorations: DecorationSet
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
				ranges.push(
					Decoration.replace({
						block: true,
						widget: new HorizontalRuleWidget(),
					}).range(block.from, block.to),
				)
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
			if (replaced) {
				ranges.push(
					Decoration.replace({
						block: true,
						widget: new CollapsedCalloutWidget(block),
					}).range(block.from, block.to),
				)
			} else {
				addLineDecoration(state, ranges, block, calloutLineDecoration(block))
			}
			continue
		}
		if (block.kind === "table") {
			if (replaced) {
				ranges.push(
					Decoration.replace({ block: true, widget: new TableWidget(block) }).range(
						block.from,
						block.to,
					),
				)
			} else {
				for (let lineNumber = block.firstLine; lineNumber <= block.lastLine; lineNumber++) {
					const line = state.doc.line(lineNumber)
					const classes = ["cm-table-line"]
					if (lineNumber === block.firstLine) classes.push("cm-table-header-line")
					if (/^\s*\|?[\s|:-]+\|?\s*$/.test(line.text)) {
						classes.push("cm-table-delimiter-line")
					}
					ranges.push(Decoration.line({ class: classes.join(" ") }).range(line.from))
				}
			}
			continue
		}
		if (block.kind === "frontmatter") {
			if (replaced) {
				ranges.push(
					Decoration.replace({ block: true, widget: new FrontmatterWidget(block) }).range(
						block.from,
						block.to,
					),
				)
			} else {
				addLineDecoration(state, ranges, block, Decoration.line({ class: "cm-frontmatter-line" }))
			}
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
		if (block.kind === "code" && selectionOverlapsBlock(selection, block)) {
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
			}
		},
		provide(field) {
			return EditorView.decorations.from(field, (value) => value.decorations)
		},
	})
}

export function getReplacedBlocks(
	state: EditorState,
	field: StateField<LivePreviewBlockState>,
): MarkdownBlock[] {
	const value = state.field(field)
	return value.blocks.filter((block) =>
		blockUsesReplacement(block, value.collapsedCallouts, state.selection),
	)
}
