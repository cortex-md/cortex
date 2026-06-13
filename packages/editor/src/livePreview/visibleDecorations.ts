import { syntaxTree } from "@codemirror/language"
import type { Range, StateField } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
} from "@codemirror/view"
import {
	getMarkdownRegistryVersion,
	getMarkdownTextTransforms,
	resolveCalloutType,
	subscribeCalloutTypes,
	subscribeMarkdownRegistry,
} from "@cortex/renderer"
import type { LivePreviewBlockState } from "./blockState"
import {
	hoveredCodeBlockChanged,
	livePreviewRegistryChanged,
	toggleCalloutCollapsed,
} from "./effects"
import {
	recordCandidateBlocks,
	recordDecorationsProduced,
	recordSyntaxNodeVisit,
	recordViewportPass,
} from "./metrics"
import {
	blockUsesReplacement,
	type CalloutBlock,
	type CodeBlock,
	findBlockContainingRange,
	findBlocksInRange,
	type MarkdownBlock,
	selectionOverlapsBlock,
} from "./model"
import {
	CalloutFoldWidget,
	CheckboxWidget,
	CopyButtonWidget,
	PortableNodeWidget,
	TextWidget,
} from "./widgets"

interface SyntaxNodeLike {
	name: string
	from: number
	to: number
	firstChild: SyntaxNodeLike | null
	nextSibling: SyntaxNodeLike | null
	parent: SyntaxNodeLike | null
}

function childNodes(node: SyntaxNodeLike, name: string): SyntaxNodeLike[] {
	const children: SyntaxNodeLike[] = []
	for (let child = node.firstChild; child; child = child.nextSibling) {
		if (child.name === name) children.push(child)
	}
	return children
}

function selectionOverlapsRange(view: EditorView, from: number, to: number): boolean {
	return view.state.selection.ranges.some((range) => range.from <= to && range.to >= from)
}

function hiddenBlockContaining(
	blocks: readonly MarkdownBlock[],
	from: number,
	to: number,
): MarkdownBlock | undefined {
	return findBlockContainingRange(blocks, from, to)
}

function calloutContaining(
	blocks: MarkdownBlock[],
	from: number,
	to: number,
): CalloutBlock | undefined {
	return hiddenBlockContaining(blocks, from, to) as CalloutBlock | undefined
}

function blockquoteContaining(
	blocks: MarkdownBlock[],
	from: number,
	to: number,
): MarkdownBlock | undefined {
	return hiddenBlockContaining(blocks, from, to)
}

function replacementRange(ranges: Range<Decoration>[], from: number, to: number): void {
	if (from < to) ranges.push(Decoration.replace({}).range(from, to))
}

function addFormatting(view: EditorView, ranges: Range<Decoration>[], node: SyntaxNodeLike): void {
	const className =
		node.name === "StrongEmphasis"
			? "cm-bold"
			: node.name === "Emphasis"
				? "cm-italic"
				: "cm-strikethrough"
	const markName = node.name === "Strikethrough" ? "StrikethroughMark" : "EmphasisMark"
	const marks = childNodes(node, markName)
	if (marks.length < 2) return
	const open = marks[0]
	const close = marks.at(-1)
	if (!close) return

	ranges.push(Decoration.mark({ class: className }).range(open.to, close.from))
	if (!selectionOverlapsRange(view, node.from, node.to)) {
		replacementRange(ranges, open.from, open.to)
		replacementRange(ranges, close.from, close.to)
	}
}

function addInlineCode(view: EditorView, ranges: Range<Decoration>[], node: SyntaxNodeLike): void {
	const marks = childNodes(node, "CodeMark")
	if (marks.length < 2) return
	const open = marks[0]
	const close = marks.at(-1)
	if (!close) return

	ranges.push(Decoration.mark({ class: "cm-inline-code" }).range(open.to, close.from))
	if (!selectionOverlapsRange(view, node.from, node.to)) {
		replacementRange(ranges, open.from, open.to)
		replacementRange(ranges, close.from, close.to)
	}
}

function addLink(view: EditorView, ranges: Range<Decoration>[], node: SyntaxNodeLike): void {
	const marks = childNodes(node, "LinkMark")
	if (marks.length < 2) return
	const textFrom = marks[0].to
	const textTo = marks[1].from
	if (textFrom >= textTo) return
	ranges.push(Decoration.mark({ class: "cm-link" }).range(textFrom, textTo))
	if (!selectionOverlapsRange(view, node.from, node.to)) {
		replacementRange(ranges, node.from, textFrom)
		replacementRange(ranges, textTo, node.to)
	}
}

function addWikiLink(view: EditorView, ranges: Range<Decoration>[], node: SyntaxNodeLike): void {
	if (node.to - node.from < 4) return
	ranges.push(Decoration.mark({ class: "cm-wiki-link" }).range(node.from + 2, node.to - 2))
	if (!selectionOverlapsRange(view, node.from, node.to)) {
		replacementRange(ranges, node.from, node.from + 2)
		replacementRange(ranges, node.to - 2, node.to)
	}
}

function addHeadingMarker(
	view: EditorView,
	ranges: Range<Decoration>[],
	node: SyntaxNodeLike,
): void {
	if (selectionOverlapsRange(view, node.from, node.to)) return
	const line = view.state.doc.lineAt(node.from)
	for (const mark of childNodes(node, "HeaderMark")) {
		replacementRange(ranges, mark.from, Math.min(mark.to + 1, line.to))
	}
}

function addQuoteMarker(
	view: EditorView,
	ranges: Range<Decoration>[],
	node: SyntaxNodeLike,
	ownerBlock: MarkdownBlock | undefined,
): void {
	if (ownerBlock?.kind === "callout" && node.from < ownerBlock.titleFrom) return
	const owner = ownerBlock ?? { from: node.from, to: node.to }
	if (selectionOverlapsRange(view, owner.from, owner.to)) return
	const line = view.state.doc.lineAt(node.from)
	replacementRange(ranges, node.from, Math.min(node.to + 1, line.to))
}

function addCalloutTitle(view: EditorView, ranges: Range<Decoration>[], block: CalloutBlock): void {
	if (selectionOverlapsBlock(view.state.selection, block)) return
	const firstLine = view.state.doc.line(block.firstLine)
	replacementRange(ranges, block.from, block.titleFrom)
	if (block.titleFrom < firstLine.to) {
		ranges.push(
			Decoration.mark({ class: "markdown-callout-title-source" }).range(
				block.titleFrom,
				firstLine.to,
			),
		)
	} else {
		ranges.push(
			Decoration.widget({
				widget: new TextWidget(
					resolveCalloutType(block.callout.type).label,
					"markdown-callout-title-source",
				),
				side: 1,
			}).range(firstLine.to),
		)
	}
	if (block.callout.fold) {
		ranges.push(
			Decoration.widget({
				widget: new CalloutFoldWidget(block.id),
				side: 2,
			}).range(firstLine.to),
		)
	}
}

function isCodeNode(node: SyntaxNodeLike | null): boolean {
	for (let current = node; current; current = current.parent) {
		if (current.name === "InlineCode" || current.name === "FencedCode") return true
	}
	return false
}

function addSemanticTransforms(
	view: EditorView,
	ranges: Range<Decoration>[],
	hiddenBlocks: readonly MarkdownBlock[],
	visibleRange: { from: number; to: number },
): void {
	const tree = syntaxTree(view.state)
	let position = visibleRange.from
	while (position <= visibleRange.to) {
		const line = view.state.doc.lineAt(position)
		const segmentFrom = Math.max(line.from, visibleRange.from)
		const segmentTo = Math.min(line.to, visibleRange.to)
		const text = view.state.sliceDoc(segmentFrom, segmentTo)
		for (const transform of getMarkdownTextTransforms(text, "live-preview")) {
			const from = segmentFrom + transform.from
			const to = segmentFrom + transform.to
			if (
				hiddenBlockContaining(hiddenBlocks, from, to) ||
				selectionOverlapsRange(view, from, to) ||
				isCodeNode(tree.resolveInner(from, 1) as SyntaxNodeLike)
			) {
				continue
			}
			const original = text.slice(transform.from, transform.to)
			const onlyNode = transform.nodes.length === 1 ? transform.nodes[0] : undefined
			if (
				onlyNode?.type === "span" &&
				onlyNode.className &&
				onlyNode.children.length === 1 &&
				onlyNode.children[0].type === "text" &&
				onlyNode.children[0].value === original
			) {
				ranges.push(Decoration.mark({ class: onlyNode.className }).range(from, to))
			} else if (onlyNode?.type === "text") {
				ranges.push(Decoration.replace({ widget: new TextWidget(onlyNode.value) }).range(from, to))
			} else {
				ranges.push(
					Decoration.replace({
						widget: new PortableNodeWidget(transform.nodes),
					}).range(from, to),
				)
			}
		}
		if (line.to >= visibleRange.to) break
		position = line.to + 1
	}
}

function addCodeControls(
	view: EditorView,
	ranges: Range<Decoration>[],
	blocks: readonly CodeBlock[],
	hoveredCodeBlockId: string | null,
): void {
	for (const block of blocks) {
		const visible =
			hoveredCodeBlockId === block.id || selectionOverlapsBlock(view.state.selection, block)
		const position = block.openFenceTo
		ranges.push(
			Decoration.widget({
				widget: new CopyButtonWidget(block.code, block.id, visible),
				side: 1,
			}).range(position),
		)
	}
}

function buildVisibleDecorations(
	view: EditorView,
	blockField: StateField<LivePreviewBlockState>,
	hoveredCodeBlockId: string | null,
): DecorationSet {
	recordViewportPass()
	const blockState = view.state.field(blockField)
	const ranges: Range<Decoration>[] = []
	const tree = syntaxTree(view.state)
	const visibleCallouts = new Map<string, CalloutBlock>()
	const visibleCodeBlocks = new Map<string, CodeBlock>()

	for (const visibleRange of view.visibleRanges) {
		const hiddenBlocks = findBlocksInRange(
			blockState.replacementBlocks,
			visibleRange.from,
			visibleRange.to,
		)
		const calloutBlocks = findBlocksInRange(
			blockState.index.callouts,
			visibleRange.from,
			visibleRange.to,
		)
		const blockquoteBlocks = findBlocksInRange(
			blockState.index.blockquotes,
			visibleRange.from,
			visibleRange.to,
		)
		const codeBlocks = findBlocksInRange(blockState.index.code, visibleRange.from, visibleRange.to)
		const tableBlocks = findBlocksInRange(blockState.index.tables, visibleRange.from, visibleRange.to)
		const sourceTables = tableBlocks.filter((block) =>
			selectionOverlapsBlock(view.state.selection, block),
		)
		const projectionBlockedBlocks = [...hiddenBlocks, ...sourceTables].sort(
			(left, right) => left.from - right.from,
		)
		recordCandidateBlocks(
			projectionBlockedBlocks.length +
				calloutBlocks.length +
				blockquoteBlocks.length +
				codeBlocks.length,
		)
		for (const block of calloutBlocks) visibleCallouts.set(block.id, block)
		for (const block of codeBlocks) visibleCodeBlocks.set(block.id, block)

		tree.iterate({
			from: visibleRange.from,
			to: visibleRange.to,
			enter(nodeRef) {
				recordSyntaxNodeVisit()
				const node = nodeRef.node as SyntaxNodeLike
				if (hiddenBlockContaining(projectionBlockedBlocks, node.from, node.to)) return false
				const callout = calloutContaining(calloutBlocks, node.from, node.to)
				const blockquote = blockquoteContaining(blockquoteBlocks, node.from, node.to)

				if (
					node.name === "StrongEmphasis" ||
					node.name === "Emphasis" ||
					node.name === "Strikethrough"
				) {
					addFormatting(view, ranges, node)
				} else if (node.name === "InlineCode") {
					addInlineCode(view, ranges, node)
				} else if (node.name === "Link") {
					if (!callout || node.from >= callout.titleFrom) addLink(view, ranges, node)
				} else if (node.name === "WikiLink") {
					addWikiLink(view, ranges, node)
				} else if (node.name.startsWith("ATXHeading")) {
					addHeadingMarker(view, ranges, node)
				} else if (node.name === "QuoteMark") {
					addQuoteMarker(view, ranges, node, callout ?? blockquote)
				} else if (node.name === "TaskMarker") {
					if (!selectionOverlapsRange(view, node.from, node.to)) {
						const checked = /^\[[xX]\]$/.test(view.state.sliceDoc(node.from, node.to))
						ranges.push(
							Decoration.replace({
								widget: new CheckboxWidget(checked, node.from),
							}).range(node.from, node.to),
						)
					}
				}
			},
		})
		addSemanticTransforms(view, ranges, projectionBlockedBlocks, visibleRange)
	}

	for (const block of visibleCallouts.values()) {
		if (!blockUsesReplacement(block, blockState.collapsedCallouts, view.state.selection)) {
			addCalloutTitle(view, ranges, block)
		}
	}
	addCodeControls(view, ranges, [...visibleCodeBlocks.values()], hoveredCodeBlockId)
	recordDecorationsProduced(ranges.length)
	return Decoration.set(ranges, true)
}

function findCodeBlockId(target: EventTarget | null): string | null {
	if (!(target instanceof HTMLElement)) return null
	return target.closest<HTMLElement>("[data-codeblock-id]")?.dataset.codeblockId ?? null
}

export function createVisibleDecorationsPlugin(blockField: StateField<LivePreviewBlockState>) {
	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet
			hoveredCodeBlockId: string | null = null
			markdownRegistryVersion = getMarkdownRegistryVersion()
			unsubscribeMarkdown: () => void
			unsubscribeCallouts: () => void

			constructor(readonly view: EditorView) {
				this.decorations = buildVisibleDecorations(view, blockField, this.hoveredCodeBlockId)
				this.unsubscribeMarkdown = subscribeMarkdownRegistry(() => {
					this.view.dispatch({ effects: livePreviewRegistryChanged.of() })
				})
				this.unsubscribeCallouts = subscribeCalloutTypes(() => {
					this.view.dispatch({ effects: livePreviewRegistryChanged.of() })
				})
			}

			update(update: ViewUpdate) {
				const hoveredEffect = update.transactions
					.flatMap((transaction) => transaction.effects)
					.find((effect) => effect.is(hoveredCodeBlockChanged))
				if (hoveredEffect) this.hoveredCodeBlockId = hoveredEffect.value

				const registryChanged = update.transactions.some((transaction) =>
					transaction.effects.some((effect) => effect.is(livePreviewRegistryChanged)),
				)
				const calloutToggled = update.transactions.some((transaction) =>
					transaction.effects.some((effect) => effect.is(toggleCalloutCollapsed)),
				)
				if (registryChanged && this.markdownRegistryVersion !== getMarkdownRegistryVersion()) {
					this.markdownRegistryVersion = getMarkdownRegistryVersion()
				}

				if (
					update.docChanged ||
					update.selectionSet ||
					update.viewportChanged ||
					hoveredEffect ||
					registryChanged ||
					calloutToggled
				) {
					this.decorations = buildVisibleDecorations(
						update.view,
						blockField,
						this.hoveredCodeBlockId,
					)
				}
			}

			destroy() {
				this.unsubscribeMarkdown()
				this.unsubscribeCallouts()
			}
		},
		{
			decorations: (plugin) => plugin.decorations,
			eventHandlers: {
				pointerover(event, view) {
					const blockId = findCodeBlockId(event.target)
					if (blockId === this.hoveredCodeBlockId) return
					view.dispatch({ effects: hoveredCodeBlockChanged.of(blockId) })
				},
				pointerout(event, view) {
					const current = findCodeBlockId(event.target)
					const next = findCodeBlockId(event.relatedTarget)
					if (current === next || next === this.hoveredCodeBlockId) return
					view.dispatch({ effects: hoveredCodeBlockChanged.of(next) })
				},
			},
		},
	)
}
