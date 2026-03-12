import type { Plugin } from "unified"
import { visit } from "unist-util-visit"

type HastElement = {
	type: string
	tagName?: string
	properties?: Record<string, unknown>
	children?: HastElement[]
	value?: string
}

export const rehypeTaskList: Plugin = () => {
	return (tree) => {
		visit(tree, "element", (node: HastElement) => {
			if (node.tagName !== "li") return

			const firstChild = node.children?.[0]
			if (firstChild?.type !== "element" || firstChild.tagName !== "p") return

			const paragraph = firstChild
			const textNode = paragraph.children?.[0]
			if (textNode?.type !== "text") return

			const checked = textNode.value?.startsWith("[x] ") || textNode.value?.startsWith("[X] ")
			const unchecked = textNode.value?.startsWith("[ ] ")

			if (!checked && !unchecked) return

			textNode.value = textNode.value?.slice(4) ?? ""

			const checkbox: HastElement = {
				type: "element",
				tagName: "input",
				properties: {
					type: "checkbox",
					checked: checked ? true : undefined,
					disabled: true,
					"data-task-checkbox": "true",
				},
				children: [],
			}

			paragraph.children = [checkbox, ...(paragraph.children ?? [])]

			if (!node.properties) node.properties = {}
			node.properties["data-task-item"] = checked ? "checked" : "unchecked"
		})
	}
}
