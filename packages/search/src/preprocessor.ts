export function stripMarkdown(raw: string): string {
	let text = raw

	text = text.replace(/^---\n[\s\S]*?\n---\n?/, "")

	text = text.replace(/```[\s\S]*?```/g, "")
	text = text.replace(/`[^`]+`/g, "")

	text = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
	text = text.replace(/\[\[([^\]]+)\]\]/g, "$1")

	text = text.replace(/\[([^\]]*)\]\([^)]+\)/g, "$1")

	text = text.replace(/https?:\/\/\S+/g, "")

	text = text.replace(/#{1,6}\s+/g, "")
	text = text.replace(/[*_~]{1,3}/g, "")
	text = text.replace(/^>\s+/gm, "")
	text = text.replace(/^[-*+]\s+/gm, "")
	text = text.replace(/^\d+\.\s+/gm, "")
	text = text.replace(/^[-*_]{3,}$/gm, "")

	text = text.replace(/!?\[([^\]]*)\]\([^)]+\)/g, "$1")

	return text.replace(/\n{3,}/g, "\n\n").trim()
}

export function extractFrontmatter(raw: string): {
	tags: string[]
	aliases: string[]
	content: string
} {
	const match = raw.match(/^---\n([\s\S]*?)\n---\n?/)
	if (!match) return { tags: [], aliases: [], content: raw }

	const yaml = match[1]
	const content = raw.slice(match[0].length)

	const tags = extractYamlArray(yaml, "tags")
	const aliases = extractYamlArray(yaml, "aliases")

	return { tags, aliases, content }
}

function extractYamlArray(yaml: string, field: string): string[] {
	const inlineMatch = yaml.match(new RegExp(`^${field}:\\s*\\[([^\\]]+)\\]`, "m"))
	if (inlineMatch) {
		return inlineMatch[1].split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
	}

	const blockMatch = yaml.match(new RegExp(`^${field}:\\s*\\n((?:\\s+-\\s+.+\\n?)*)`, "m"))
	if (blockMatch) {
		return blockMatch[1]
			.split("\n")
			.map((line) =>
				line
					.replace(/^\s*-\s*/, "")
					.trim()
					.replace(/^["']|["']$/g, ""),
			)
			.filter(Boolean)
	}

	return []
}
