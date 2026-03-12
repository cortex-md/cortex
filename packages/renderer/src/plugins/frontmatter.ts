import type { Plugin } from "unified"

const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---/

export const remarkFrontmatter: Plugin = () => {
	return (tree, file) => {
		const markdown = String(file)
		if (!FRONTMATTER_PATTERN.test(markdown)) return

		const parent = tree as unknown as { children: Array<{ type: string }> }
		const firstChild = parent.children[0]
		if (firstChild?.type === "thematicBreak" || firstChild?.type === "yaml") {
			parent.children.shift()

			if (parent.children[0]?.type === "thematicBreak") {
				parent.children.shift()
			}
		}
	}
}
