import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"

export interface TagColor {
	tag: string
	color: string | null
}

export interface TagEntry {
	tag: string
	color: string | null
	filePaths: string[]
}

export interface TagsState {
	tagIndex: Record<string, string[]>
	tagColors: Record<string, string>
	activeTagFilter: string | null

	buildIndex: (vaultPath: string, filePaths: string[]) => Promise<void>
	updateFileInIndex: (filePath: string, rawContent: string) => void
	removeFileFromIndex: (filePath: string) => void
	setActiveTagFilter: (tag: string | null) => void
	getAllTags: () => TagEntry[]
	getTagsForFile: (filePath: string) => string[]
	getFilesForTag: (tag: string) => string[]
	getTagColor: (tag: string) => string | null
	setTagColor: (vaultPath: string, tag: string, color: string | null) => Promise<void>
	loadTagColors: (vaultPath: string) => Promise<void>
	addTagToFile: (filePath: string, tag: string) => Promise<void>
	removeTagFromFile: (filePath: string, tag: string) => Promise<void>
}

function extractTagsFromContent(rawContent: string): string[] {
	const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---\n?/)
	if (!frontmatterMatch) return extractInlineTags(rawContent)

	const yaml = frontmatterMatch[1]
	const bodyContent = rawContent.slice(frontmatterMatch[0].length)

	const yamlTags = extractYamlTagList(yaml)
	const inlineTags = extractInlineTags(bodyContent)

	return [...new Set([...yamlTags, ...inlineTags])]
}

function extractYamlTagList(yaml: string): string[] {
	const inlineMatch = yaml.match(/^tags:\s*\[([^\]]+)\]/m)
	if (inlineMatch) {
		return inlineMatch[1].split(",").map((s) =>
			s
				.trim()
				.replace(/^["']|["']$/g, "")
				.toLowerCase(),
		)
	}

	const blockMatch = yaml.match(/^tags:\s*\n((?:\s+-\s+.+\n?)*)/m)
	if (blockMatch) {
		return blockMatch[1]
			.split("\n")
			.map((line) =>
				line
					.replace(/^\s*-\s*/, "")
					.trim()
					.replace(/^["']|["']$/g, "")
					.toLowerCase(),
			)
			.filter(Boolean)
	}

	return []
}

function extractInlineTags(content: string): string[] {
	const matches = content.match(/#([a-zA-Z][a-zA-Z0-9_/-]*)/g)
	if (!matches) return []
	return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))]
}

function addTagToFrontmatter(content: string, tag: string): string {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/)

	if (!frontmatterMatch) {
		return `---\ntags:\n  - ${tag}\n---\n${content}`
	}

	const yaml = frontmatterMatch[1]
	const rest = content.slice(frontmatterMatch[0].length)

	const inlineMatch = yaml.match(/^(tags:\s*)\[([^\]]*)\]/m)
	if (inlineMatch) {
		const existingTags = inlineMatch[2]
			.split(",")
			.map((s) => s.trim().replace(/^["']|["']$/g, ""))
			.filter(Boolean)
		if (existingTags.some((t) => t.toLowerCase() === tag.toLowerCase())) return content
		existingTags.push(tag)
		const updatedYaml = yaml.replace(
			inlineMatch[0],
			`${inlineMatch[1]}[${existingTags.join(", ")}]`,
		)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const blockMatch = yaml.match(/^(tags:\s*\n)((?:\s+-\s+.+\n?)*)/m)
	if (blockMatch) {
		const existingLines = blockMatch[2]
			.split("\n")
			.map((l) =>
				l
					.replace(/^\s*-\s*/, "")
					.trim()
					.replace(/^["']|["']$/g, ""),
			)
			.filter(Boolean)
		if (existingLines.some((t) => t.toLowerCase() === tag.toLowerCase())) return content
		const updatedBlock = `${blockMatch[1]}${blockMatch[2]}  - ${tag}\n`
		const updatedYaml = yaml.replace(blockMatch[0], updatedBlock)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const updatedYaml = `${yaml}\ntags:\n  - ${tag}`
	return `---\n${updatedYaml}\n---\n${rest}`
}

function removeTagFromFrontmatter(content: string, tag: string): string {
	const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/)
	if (!frontmatterMatch) return content

	const yaml = frontmatterMatch[1]
	const rest = content.slice(frontmatterMatch[0].length)

	const inlineMatch = yaml.match(/^(tags:\s*)\[([^\]]*)\]/m)
	if (inlineMatch) {
		const existingTags = inlineMatch[2]
			.split(",")
			.map((s) => s.trim().replace(/^["']|["']$/g, ""))
			.filter((t) => t.toLowerCase() !== tag.toLowerCase())
		if (existingTags.length === 0) {
			const updatedYaml = yaml.replace(/^tags:\s*\[[^\]]*\]\n?/m, "")
			return `---\n${updatedYaml}\n---\n${rest}`
		}
		const updatedYaml = yaml.replace(
			inlineMatch[0],
			`${inlineMatch[1]}[${existingTags.join(", ")}]`,
		)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	const blockMatch = yaml.match(/^(tags:\s*\n)((?:\s+-\s+.+\n?)*)/m)
	if (blockMatch) {
		const lines = blockMatch[2].split("\n").filter(Boolean)
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
		const updatedBlock = `${blockMatch[1]}${filtered.join("\n")}\n`
		const updatedYaml = yaml.replace(blockMatch[0], updatedBlock)
		return `---\n${updatedYaml}\n---\n${rest}`
	}

	return content
}

const TAG_COLORS_FILE = ".cortex/tags.json"
const fileTagsCache = new Map<string, string[]>()

async function loadTagColorsFromDisk(vaultPath: string): Promise<Record<string, string>> {
	try {
		const platform = getPlatform()
		const raw = await platform.fs.readFile(`${vaultPath}/${TAG_COLORS_FILE}`)
		const parsed = JSON.parse(raw)
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, string>
		}
	} catch (_e) {}
	return {}
}

async function saveTagColorsToDisk(
	vaultPath: string,
	colors: Record<string, string>,
): Promise<void> {
	try {
		const platform = getPlatform()
		await platform.fs.writeFile(
			`${vaultPath}/${TAG_COLORS_FILE}`,
			JSON.stringify(colors, null, "\t"),
		)
	} catch (_e) {}
}

export const useTagsStore = create<TagsState>()(
	devtools(
		(set, get) => ({
			tagIndex: {},
			tagColors: {},
			activeTagFilter: null,

			buildIndex: async (_vaultPath, filePaths) => {
				const platform = getPlatform()
				const newTagIndex: Record<string, string[]> = {}
				fileTagsCache.clear()

				const mdFilePaths = filePaths.filter((p) => p.endsWith(".md"))

				for (const filePath of mdFilePaths) {
					try {
						const content = await platform.fs.readFile(filePath)
						const tags = extractTagsFromContent(content)
						fileTagsCache.set(filePath, tags)

						for (const tag of tags) {
							if (!newTagIndex[tag]) newTagIndex[tag] = []
							if (!newTagIndex[tag].includes(filePath)) {
								newTagIndex[tag].push(filePath)
							}
						}
					} catch (_e) {}
				}

				set({ tagIndex: newTagIndex })
			},

			updateFileInIndex: (filePath, rawContent) => {
				const previousTags = fileTagsCache.get(filePath) ?? []
				const updatedTags = extractTagsFromContent(rawContent)

				fileTagsCache.set(filePath, updatedTags)

				const { tagIndex } = get()
				const newIndex = { ...tagIndex }

				for (const tag of previousTags) {
					if (newIndex[tag]) {
						newIndex[tag] = newIndex[tag].filter((p) => p !== filePath)
						if (newIndex[tag].length === 0) delete newIndex[tag]
					}
				}

				for (const tag of updatedTags) {
					if (!newIndex[tag]) newIndex[tag] = []
					if (!newIndex[tag].includes(filePath)) {
						newIndex[tag] = [...newIndex[tag], filePath]
					}
				}

				set({ tagIndex: newIndex })
			},

			removeFileFromIndex: (filePath) => {
				const previousTags = fileTagsCache.get(filePath) ?? []
				fileTagsCache.delete(filePath)

				const { tagIndex } = get()
				const newIndex = { ...tagIndex }

				for (const tag of previousTags) {
					if (newIndex[tag]) {
						newIndex[tag] = newIndex[tag].filter((p) => p !== filePath)
						if (newIndex[tag].length === 0) delete newIndex[tag]
					}
				}

				set({ tagIndex: newIndex })
			},

			setActiveTagFilter: (tag) => {
				set({ activeTagFilter: tag })
			},

			getAllTags: () => {
				const { tagIndex, tagColors } = get()
				return Object.entries(tagIndex)
					.map(([tag, filePaths]) => ({
						tag,
						color: tagColors[tag] ?? null,
						filePaths,
					}))
					.sort((a, b) => b.filePaths.length - a.filePaths.length || a.tag.localeCompare(b.tag))
			},

			getTagsForFile: (filePath) => {
				return fileTagsCache.get(filePath) ?? []
			},

			getFilesForTag: (tag) => {
				const { tagIndex } = get()
				return tagIndex[tag] ?? []
			},

			getTagColor: (tag) => {
				return get().tagColors[tag] ?? null
			},

			setTagColor: async (vaultPath, tag, color) => {
				const { tagColors } = get()
				const newColors = { ...tagColors }
				if (color) {
					newColors[tag] = color
				} else {
					delete newColors[tag]
				}
				set({ tagColors: newColors })
				await saveTagColorsToDisk(vaultPath, newColors)
			},

			loadTagColors: async (vaultPath) => {
				const colors = await loadTagColorsFromDisk(vaultPath)
				set({ tagColors: colors })
			},

			addTagToFile: async (filePath, tag) => {
				const platform = getPlatform()
				const content = await platform.fs.readFile(filePath)
				const updated = addTagToFrontmatter(content, tag)
				if (updated === content) return
				await platform.fs.writeFile(filePath, updated)
				get().updateFileInIndex(filePath, updated)
			},

			removeTagFromFile: async (filePath, tag) => {
				const platform = getPlatform()
				const content = await platform.fs.readFile(filePath)
				const updated = removeTagFromFrontmatter(content, tag)
				if (updated === content) return
				await platform.fs.writeFile(filePath, updated)
				get().updateFileInIndex(filePath, updated)
			},
		}),
		{ name: "tagsStore" },
	),
)
