import { GITHUB_EMOJI_MAP } from "./emojiMap"

const EMOJI_REGEX = /:([a-z0-9_+-]+):/gi

interface TextNode {
	type: "text"
	value: string
}

interface Parent {
	type: string
	children: (TextNode | Parent)[]
}

function replaceEmojiInText(node: TextNode): (TextNode | Parent)[] {
	const { value } = node
	EMOJI_REGEX.lastIndex = 0

	const parts: TextNode[] = []
	let lastIndex = 0

	for (let match = EMOJI_REGEX.exec(value); match !== null; match = EMOJI_REGEX.exec(value)) {
		const emoji = GITHUB_EMOJI_MAP[match[1].toLowerCase()]
		if (!emoji) continue

		if (match.index > lastIndex) {
			parts.push({ type: "text", value: value.slice(lastIndex, match.index) })
		}
		parts.push({ type: "text", value: emoji })
		lastIndex = match.index + match[0].length
	}

	if (lastIndex === 0) return [node]
	if (lastIndex < value.length) {
		parts.push({ type: "text", value: value.slice(lastIndex) })
	}
	return parts
}

function walkTree(node: Parent): void {
	if (!node.children) return

	const newChildren: (TextNode | Parent)[] = []
	for (const child of node.children) {
		if (child.type === "text") {
			newChildren.push(...replaceEmojiInText(child as TextNode))
		} else {
			if ("children" in child) {
				walkTree(child as Parent)
			}
			newChildren.push(child)
		}
	}
	node.children = newChildren
}

export function remarkEmojiPlugin() {
	return (tree: Parent) => {
		walkTree(tree)
	}
}
