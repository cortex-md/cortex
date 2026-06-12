import type { Plugin } from "unified"
import { visit } from "unist-util-visit"

type HastElement = {
	type: string
	tagName?: string
	properties?: Record<string, unknown>
	children?: HastElement[]
	value?: string
}

function isTaskCheckbox(node: HastElement | undefined): boolean {
	if (node?.type !== "element" || node.tagName !== "input") return false
	return node.properties?.type === "checkbox"
}

function markTaskItem(node: HastElement, checkbox: HastElement, checked: boolean): void {
	if (!checkbox.properties) checkbox.properties = {}
	checkbox.properties.checked = checked ? true : undefined
	checkbox.properties.disabled = true
	checkbox.properties["data-task-checkbox"] = "true"

	if (!node.properties) node.properties = {}
	node.properties["data-task-item"] = checked ? "checked" : "unchecked"
}

export const rehypeTaskList: Plugin = () => {
	return (tree) => {
		visit(tree, "element", (node: HastElement) => {
			if (node.tagName !== "li") return

			const directCheckbox = node.children?.find(isTaskCheckbox)
			if (directCheckbox) {
				markTaskItem(node, directCheckbox, directCheckbox.properties?.checked === true)
				return
			}

			const firstChild = node.children?.[0]
			if (firstChild?.type !== "element" || firstChild.tagName !== "p") return

			const paragraph = firstChild
			const paragraphCheckbox = paragraph.children?.find(isTaskCheckbox)
			if (paragraphCheckbox) {
				markTaskItem(node, paragraphCheckbox, paragraphCheckbox.properties?.checked === true)
				return
			}

			const textNode = paragraph.children?.[0]
			if (textNode?.type !== "text") return

			const checked =
				textNode.value?.startsWith("[x] ") === true || textNode.value?.startsWith("[X] ") === true
			const unchecked = textNode.value?.startsWith("[ ] ") === true

			if (!checked && !unchecked) return

			textNode.value = textNode.value?.slice(4) ?? ""

			const checkbox: HastElement = {
				type: "element",
				tagName: "input",
				properties: {
					type: "checkbox",
				},
				children: [],
			}

			paragraph.children = [checkbox, ...(paragraph.children ?? [])]
			markTaskItem(node, checkbox, checked)
		})
	}
}
