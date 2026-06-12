import type { Plugin } from "unified"
import type { FrontmatterField } from "../frontmatter"
import { parseFrontmatterFields } from "../frontmatter"

export const remarkStripFrontmatter: Plugin = () => {
	return (tree, file) => {
		const parent = tree as unknown as { children: Array<{ type: string; value?: string }> }
		const firstChild = parent.children[0]
		if (firstChild?.type !== "yaml") return

		const fields = parseFrontmatterFields(firstChild.value ?? "")
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
		field.key === "tags" && field.values.length > 0
			? field.values.flatMap(buildTagChips)
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
