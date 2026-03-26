import type { EditorState } from "@codemirror/state"
import { RangeSetBuilder, StateField, type Transaction } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"
import { isCursorInRange } from "./utils"

interface FrontmatterRange {
	from: number
	to: number
	yamlContent: string
}

export function findFrontmatter(doc: { toString(): string }): FrontmatterRange | null {
	const text = doc.toString()
	if (!text.startsWith("---\n")) return null

	const closingIndex = text.indexOf("\n---", 4)
	if (closingIndex === -1) return null

	const closingLineEnd = closingIndex + 4
	const to = text[closingLineEnd] === "\n" ? closingLineEnd + 1 : closingLineEnd
	const yamlContent = text.slice(4, closingIndex)

	return { from: 0, to, yamlContent }
}

interface FrontmatterField {
	key: string
	value: string
}

function parseYamlFields(yaml: string): FrontmatterField[] {
	const fields: FrontmatterField[] = []
	const lines = yaml.split("\n")
	let currentKey = ""
	let currentValue = ""
	let collectingBlock = false

	for (const line of lines) {
		const keyMatch = line.match(/^(\w[\w-]*):\s*(.*)$/)
		if (keyMatch) {
			if (collectingBlock && currentKey) {
				fields.push({ key: currentKey, value: currentValue.trim() })
			}
			currentKey = keyMatch[1]
			const inlineValue = keyMatch[2].trim()

			if (inlineValue && !inlineValue.startsWith("[") && inlineValue !== "") {
				fields.push({ key: currentKey, value: inlineValue })
				collectingBlock = false
				currentKey = ""
			} else if (inlineValue.startsWith("[")) {
				const items = inlineValue
					.replace(/^\[|\]$/g, "")
					.split(",")
					.map((s) => s.trim().replace(/^["']|["']$/g, ""))
					.filter(Boolean)
				fields.push({ key: currentKey, value: items.join(", ") })
				collectingBlock = false
				currentKey = ""
			} else {
				collectingBlock = true
				currentValue = ""
			}
		} else if (collectingBlock && line.match(/^\s+-\s+/)) {
			const item = line
				.replace(/^\s+-\s+/, "")
				.trim()
				.replace(/^["']|["']$/g, "")
			currentValue += (currentValue ? ", " : "") + item
		}
	}

	if (collectingBlock && currentKey) {
		fields.push({ key: currentKey, value: currentValue.trim() })
	}

	return fields
}

class FrontmatterWidget extends WidgetType {
	constructor(readonly fields: FrontmatterField[]) {
		super()
	}

	toDOM() {
		const container = document.createElement("div")
		container.className = "cm-frontmatter-card"

		const header = document.createElement("div")
		header.className = "cm-frontmatter-header"
		header.textContent = "Properties"
		container.appendChild(header)

		const table = document.createElement("div")
		table.className = "cm-frontmatter-fields"

		for (const field of this.fields) {
			const row = document.createElement("div")
			row.className = "cm-frontmatter-row"

			const keyEl = document.createElement("span")
			keyEl.className = "cm-frontmatter-key"
			keyEl.textContent = field.key
			row.appendChild(keyEl)

			const valueEl = document.createElement("span")
			valueEl.className = "cm-frontmatter-value"

			if (field.key === "tags" && field.value) {
				const tags = field.value
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
				for (const tag of tags) {
					const chip = document.createElement("span")
					chip.className = "cm-frontmatter-tag"
					chip.textContent = tag
					valueEl.appendChild(chip)
				}
			} else {
				valueEl.textContent = field.value || "—"
			}

			row.appendChild(valueEl)
			table.appendChild(row)
		}

		container.appendChild(table)
		return container
	}

	eq(other: FrontmatterWidget) {
		if (this.fields.length !== other.fields.length) return false
		return this.fields.every(
			(f, i) => f.key === other.fields[i].key && f.value === other.fields[i].value,
		)
	}

	ignoreEvent() {
		return false
	}
}

function buildDecorations(state: EditorState): DecorationSet {
	const fm = findFrontmatter(state.doc)
	if (!fm) return Decoration.none

	const closingDelimiterLine = state.doc.lineAt(fm.to - 1)
	const yamlContentStart = fm.from + 4
	const yamlContentEnd = closingDelimiterLine.from - 1
	const cursorInside =
		yamlContentEnd > yamlContentStart && isCursorInRange(state, yamlContentStart, yamlContentEnd)

	const builder = new RangeSetBuilder<Decoration>()

	if (cursorInside) {
		const fmLineDeco = Decoration.line({ class: "cm-frontmatter-line" })
		for (let pos = fm.from; pos < fm.to; ) {
			const line = state.doc.lineAt(pos)
			if (line.text.length > 0 || pos === fm.from) {
				builder.add(line.from, line.from, fmLineDeco)
			}
			pos = line.to + 1
		}
	} else {
		const fields = parseYamlFields(fm.yamlContent)
		const lastLine = state.doc.lineAt(fm.to - 1)
		builder.add(
			fm.from,
			lastLine.to,
			Decoration.replace({
				widget: new FrontmatterWidget(fields),
				block: true,
			}),
		)
	}

	return builder.finish()
}

export const frontmatterPlugin = StateField.define<DecorationSet>({
	create(state) {
		return buildDecorations(state)
	},
	update(decorations, transaction: Transaction) {
		if (transaction.docChanged || transaction.selection) {
			return buildDecorations(transaction.state)
		}
		return decorations
	},
	provide(field) {
		return EditorView.decorations.from(field)
	},
})
