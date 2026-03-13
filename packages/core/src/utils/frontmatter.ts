const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/
const INLINE_ARRAY_REGEX = (field: string) => new RegExp(`^${field}:\\s*\\[([^\\]]*)\\]`, "m")
const BLOCK_ARRAY_REGEX = (field: string) =>
	new RegExp(`^${field}:\\s*\\n((?:\\s+-\\s+.+\\n?)*)`, "m")
const SCALAR_REGEX = (field: string) => new RegExp(`^${field}:\\s*(.+)$`, "m")

export interface Frontmatter {
	created?: string
	date?: string
	tags: string[]
	aliases: string[]
	[key: string]: unknown
}

export interface ParsedNote {
	frontmatter: Frontmatter | null
	rawYaml: string
	body: string
	hasFrontmatter: boolean
}

export function hasFrontmatter(content: string): boolean {
	return FRONTMATTER_REGEX.test(content)
}

export function parseFrontmatter(content: string): ParsedNote {
	const match = content.match(FRONTMATTER_REGEX)
	if (!match) {
		return { frontmatter: null, rawYaml: "", body: content, hasFrontmatter: false }
	}

	const rawYaml = match[1]
	const body = content.slice(match[0].length)
	const tags = extractYamlArray(rawYaml, "tags")
	const aliases = extractYamlArray(rawYaml, "aliases")
	const created = extractYamlScalar(rawYaml, "created") ?? undefined
	const date = extractYamlScalar(rawYaml, "date") ?? undefined

	return {
		frontmatter: { created, date, tags, aliases },
		rawYaml,
		body,
		hasFrontmatter: true,
	}
}

export function extractYamlArray(yaml: string, field: string): string[] {
	const inlineMatch = yaml.match(INLINE_ARRAY_REGEX(field))
	if (inlineMatch) {
		if (!inlineMatch[1].trim()) return []
		return inlineMatch[1]
			.split(",")
			.map((s) => s.trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean)
	}

	const blockMatch = yaml.match(BLOCK_ARRAY_REGEX(field))
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

function extractYamlScalar(yaml: string, field: string): string | null {
	const match = yaml.match(SCALAR_REGEX(field))
	if (!match) return null
	return match[1].trim().replace(/^["']|["']$/g, "")
}

export function createDefaultFrontmatter(options?: {
	tags?: string[]
	created?: string
	extraFields?: Record<string, string>
}): string {
	const created = options?.created ?? new Date().toISOString()
	const tags = options?.tags ?? []

	let yaml = `---\ncreated: ${created}\ntags:`
	if (tags.length === 0) {
		yaml += " []"
	} else {
		yaml += `\n${tags.map((t) => `  - ${t}`).join("\n")}`
	}

	if (options?.extraFields) {
		for (const [key, value] of Object.entries(options.extraFields)) {
			yaml += `\n${key}: ${value}`
		}
	}

	yaml += "\n---\n"
	return yaml
}

export function updateFrontmatterField(
	content: string,
	field: string,
	value: string | string[],
): string {
	const match = content.match(FRONTMATTER_REGEX)

	if (!match) {
		const yaml = buildFieldYaml(field, value)
		return `---\n${yaml}\n---\n${content}`
	}

	let yaml = match[1]
	const rest = content.slice(match[0].length)
	const newFieldYaml = buildFieldYaml(field, value)

	if (Array.isArray(value)) {
		const inlineMatch = yaml.match(INLINE_ARRAY_REGEX(field))
		if (inlineMatch) {
			yaml = yaml.replace(inlineMatch[0], newFieldYaml)
			return `---\n${yaml}\n---\n${rest}`
		}

		const blockMatch = yaml.match(BLOCK_ARRAY_REGEX(field))
		if (blockMatch) {
			yaml = yaml.replace(blockMatch[0], newFieldYaml)
			return `---\n${yaml}\n---\n${rest}`
		}

		yaml += `\n${newFieldYaml}`
		return `---\n${yaml}\n---\n${rest}`
	}

	const scalarMatch = yaml.match(SCALAR_REGEX(field))
	if (scalarMatch) {
		yaml = yaml.replace(scalarMatch[0], newFieldYaml)
		return `---\n${yaml}\n---\n${rest}`
	}

	yaml += `\n${newFieldYaml}`
	return `---\n${yaml}\n---\n${rest}`
}

function buildFieldYaml(field: string, value: string | string[]): string {
	if (Array.isArray(value)) {
		if (value.length === 0) return `${field}: []`
		return `${field}:\n${value.map((v) => `  - ${v}`).join("\n")}`
	}
	return `${field}: ${value}`
}

export function addTagToFrontmatter(content: string, tag: string): string {
	const { frontmatter, hasFrontmatter: hasFm } = parseFrontmatter(content)

	if (!hasFm || !frontmatter) {
		return `---\ntags:\n  - ${tag}\n---\n${content}`
	}

	const existingTags = frontmatter.tags
	if (existingTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return content

	const match = content.match(FRONTMATTER_REGEX)!
	const yaml = match[1]
	const rest = content.slice(match[0].length)

	const inlineMatch = yaml.match(INLINE_ARRAY_REGEX("tags"))
	if (inlineMatch) {
		const tags = [...existingTags, tag]
		const updatedYaml = yaml.replace(inlineMatch[0], `tags: [${tags.join(", ")}]`)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const blockMatch = yaml.match(BLOCK_ARRAY_REGEX("tags"))
	if (blockMatch) {
		const updatedBlock = `${blockMatch[1]}  - ${tag}\n`
		const updatedYaml = yaml.replace(blockMatch[0], `tags:\n${updatedBlock}`)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const updatedYaml = `${yaml}\ntags:\n  - ${tag}`
	return `---\n${updatedYaml}\n---\n${rest}`
}

export function removeTagFromFrontmatter(content: string, tag: string): string {
	const match = content.match(FRONTMATTER_REGEX)
	if (!match) return content

	const yaml = match[1]
	const rest = content.slice(match[0].length)

	const inlineMatch = yaml.match(INLINE_ARRAY_REGEX("tags"))
	if (inlineMatch) {
		const existing = inlineMatch[1]
			.split(",")
			.map((s) => s.trim().replace(/^["']|["']$/g, ""))
			.filter((t) => t.toLowerCase() !== tag.toLowerCase())
		if (existing.length === 0) {
			const updatedYaml = yaml.replace(/^tags:\s*\[[^\]]*\]\n?/m, "")
			return `---\n${updatedYaml}\n---\n${rest}`
		}
		const updatedYaml = yaml.replace(inlineMatch[0], `tags: [${existing.join(", ")}]`)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const blockMatch = yaml.match(BLOCK_ARRAY_REGEX("tags"))
	if (blockMatch) {
		const lines = blockMatch[1].split("\n").filter(Boolean)
		const filtered = lines.filter((line) => {
			const value = line
				.replace(/^\s*-\s*/, "")
				.trim()
				.replace(/^["']|["']$/g, "")
			return value.toLowerCase() !== tag.toLowerCase()
		})
		if (filtered.length === 0) {
			const updatedYaml = yaml.replace(blockMatch[0], "")
			return `---\n${updatedYaml}\n---\n${rest}`
		}
		const updatedBlock = `tags:\n${filtered.join("\n")}\n`
		const updatedYaml = yaml.replace(blockMatch[0], updatedBlock)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	return content
}

export function extractInlineTags(content: string): string[] {
	const matches = content.match(/#([a-zA-Z][a-zA-Z0-9_/-]*)/g)
	if (!matches) return []
	return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))]
}

export function extractAllTags(content: string): string[] {
	const { frontmatter, body } = parseFrontmatter(content)
	const yamlTags = (frontmatter?.tags ?? []).map((t) => t.toLowerCase())
	const inlineTags = extractInlineTags(body)
	return [...new Set([...yamlTags, ...inlineTags])]
}
