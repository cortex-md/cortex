import type { Extension } from "@codemirror/state"
import { RangeSetBuilder } from "@codemirror/state"
import {
	Decoration,
	type DecorationSet,
	type EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view"
import type {
	LivePreviewDeclaration,
	LivePreviewInlineRule,
	LivePreviewWidgetDescriptor,
} from "cortex-plugin-api"
import { isCursorInRange } from "./utils"

class PluginWidget extends WidgetType {
	constructor(private readonly descriptor: LivePreviewWidgetDescriptor) {
		super()
	}

	toDOM(): HTMLElement {
		const element = document.createElement(this.descriptor.tag)
		if (this.descriptor.textContent) {
			element.textContent = this.descriptor.textContent
		}
		if (this.descriptor.className) {
			element.className = this.descriptor.className
		}
		if (this.descriptor.attributes) {
			for (const [key, value] of Object.entries(this.descriptor.attributes)) {
				element.setAttribute(key, value)
			}
		}
		return element
	}

	eq(other: PluginWidget): boolean {
		return (
			this.descriptor.tag === other.descriptor.tag &&
			this.descriptor.textContent === other.descriptor.textContent &&
			this.descriptor.className === other.descriptor.className
		)
	}
}

class TextWidget extends WidgetType {
	constructor(private readonly text: string) {
		super()
	}

	toDOM(): HTMLElement {
		const span = document.createElement("span")
		span.textContent = this.text
		return span
	}

	eq(other: TextWidget): boolean {
		return this.text === other.text
	}
}

interface CompiledRule {
	regex: RegExp
	rule: LivePreviewInlineRule
}

function compileRules(rules: LivePreviewInlineRule[]): CompiledRule[] {
	return rules.map((rule) => ({
		regex: new RegExp(rule.pattern, rule.flags ?? "gi"),
		rule,
	}))
}

function buildDecorations(
	view: EditorView,
	compiledRules: CompiledRule[],
	cursorAware: boolean,
): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>()
	const decorations: { from: number; to: number; decoration: Decoration }[] = []

	for (const { from, to } of view.visibleRanges) {
		const text = view.state.sliceDoc(from, to)

		for (const { regex, rule } of compiledRules) {
			regex.lastIndex = 0

			for (let match = regex.exec(text); match !== null; match = regex.exec(text)) {
				const start = from + match.index
				const end = start + match[0].length

				if (cursorAware && isCursorInRange(view.state, start, end)) continue

				const { replacement } = rule

				switch (replacement.type) {
					case "text": {
						const content =
							typeof replacement.content === "function"
								? replacement.content(match)
								: replacement.content
						decorations.push({
							from: start,
							to: end,
							decoration: Decoration.replace({
								widget: new TextWidget(content),
							}),
						})
						break
					}
					case "widget": {
						const descriptor = replacement.render(match)
						decorations.push({
							from: start,
							to: end,
							decoration: Decoration.replace({
								widget: new PluginWidget(descriptor),
							}),
						})
						break
					}
					case "mark": {
						decorations.push({
							from: start,
							to: end,
							decoration: Decoration.mark({ class: replacement.className }),
						})
						break
					}
				}
			}
		}
	}

	decorations.sort((a, b) => a.from - b.from || a.to - b.to)
	for (const { from, to, decoration } of decorations) {
		builder.add(from, to, decoration)
	}

	return builder.finish()
}

export function buildPluginLivePreview(declaration: LivePreviewDeclaration): Extension {
	const cursorAware = declaration.cursorAware !== false
	const compiledRules = compileRules(declaration.inlineRules ?? [])

	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view, compiledRules, cursorAware)
			}

			update(update: ViewUpdate) {
				if (update.docChanged || update.viewportChanged || update.selectionSet) {
					this.decorations = buildDecorations(update.view, compiledRules, cursorAware)
				}
			}
		},
		{ decorations: (v) => v.decorations },
	)
}
