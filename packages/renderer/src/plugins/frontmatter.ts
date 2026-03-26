import type { Plugin } from "unified"

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

export const remarkStripFrontmatter: Plugin = () => {
	return (tree, file) => {
		const parent = tree as unknown as { children: Array<{ type: string; value?: string }> }
		const firstChild = parent.children[0]
		if (firstChild?.type !== "yaml") return

		const fields = parseYamlFields(firstChild.value ?? "")
		file.data.frontmatterFields = fields
		parent.children.shift()
	}
}

interface HastElement {
	type: "element"
	tagName: string
	properties: Record<string, string>
	children: (HastElement | HastText)[]
}

interface HastText {
	type: "text"
	value: string
}

function hastElement(
	tagName: string,
	properties: Record<string, string>,
	children: (HastElement | HastText)[],
): HastElement {
	return { type: "element", tagName, properties, children }
}

function hastText(value: string): HastText {
	return { type: "text", value }
}

function buildTagChips(tagString: string): HastElement[] {
	return tagString
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean)
		.map((tag) => hastElement("span", { className: "frontmatter-tag" }, [hastText(tag)]))
}

function buildFieldRow(field: FrontmatterField): HastElement {
	const keyEl = hastElement("span", { className: "frontmatter-key" }, [hastText(field.key)])

	const valueChildren: (HastElement | HastText)[] =
		field.key === "tags" && field.value
			? buildTagChips(field.value)
			: [hastText(field.value || "—")]

	const valueEl = hastElement("span", { className: "frontmatter-value" }, valueChildren)

	return hastElement("div", { className: "frontmatter-row" }, [keyEl, valueEl])
}

export const rehypeInjectFrontmatterCard: Plugin = () => {
	return (tree, file) => {
		const fields = file.data.frontmatterFields as FrontmatterField[] | undefined
		if (!fields || fields.length === 0) return

		const header = hastElement("div", { className: "frontmatter-header" }, [hastText("Properties")])

		const rows = fields.map(buildFieldRow)
		const fieldsContainer = hastElement("div", { className: "frontmatter-fields" }, rows)

		const card = hastElement("div", { className: "frontmatter-card" }, [header, fieldsContainer])

		const parent = tree as unknown as { children: unknown[] }
		parent.children.unshift(card)
	}
}
