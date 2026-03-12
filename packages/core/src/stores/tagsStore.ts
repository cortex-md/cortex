import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface TagEntry {
	tag: string
	filePaths: string[]
}

export interface TagsState {
	tagIndex: Map<string, Set<string>>
	activeTagFilter: string | null

	buildIndex: (vaultPath: string, filePaths: string[]) => Promise<void>
	updateFileInIndex: (filePath: string, rawContent: string) => void
	removeFileFromIndex: (filePath: string) => void
	setActiveTagFilter: (tag: string | null) => void
	getAllTags: () => TagEntry[]
	getTagsForFile: (filePath: string) => string[]
	getFilesForTag: (tag: string) => string[]
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

const fileTagsCache = new Map<string, string[]>()

export const useTagsStore = create<TagsState>()(
	devtools(
		immer((set, get) => ({
			tagIndex: new Map(),
			activeTagFilter: null,

			buildIndex: async (vaultPath, filePaths) => {
				const platform = getPlatform()
				const newTagIndex = new Map<string, Set<string>>()
				fileTagsCache.clear()

				const mdFilePaths = filePaths.filter((p) => p.endsWith(".md"))

				for (const filePath of mdFilePaths) {
					try {
						const content = await platform.fs.readFile(filePath)
						const tags = extractTagsFromContent(content)
						fileTagsCache.set(filePath, tags)

						for (const tag of tags) {
							if (!newTagIndex.has(tag)) newTagIndex.set(tag, new Set())
							newTagIndex.get(tag)!.add(filePath)
						}
					} catch (_e) {}
				}

				set((state) => {
					state.tagIndex = newTagIndex
				})
			},

			updateFileInIndex: (filePath, rawContent) => {
				const previousTags = fileTagsCache.get(filePath) ?? []
				const updatedTags = extractTagsFromContent(rawContent)

				fileTagsCache.set(filePath, updatedTags)

				set((state) => {
					for (const tag of previousTags) {
						state.tagIndex.get(tag)?.delete(filePath)
						if (state.tagIndex.get(tag)?.size === 0) {
							state.tagIndex.delete(tag)
						}
					}

					for (const tag of updatedTags) {
						if (!state.tagIndex.has(tag)) state.tagIndex.set(tag, new Set())
						state.tagIndex.get(tag)!.add(filePath)
					}
				})
			},

			removeFileFromIndex: (filePath) => {
				const previousTags = fileTagsCache.get(filePath) ?? []
				fileTagsCache.delete(filePath)

				set((state) => {
					for (const tag of previousTags) {
						state.tagIndex.get(tag)?.delete(filePath)
						if (state.tagIndex.get(tag)?.size === 0) {
							state.tagIndex.delete(tag)
						}
					}
				})
			},

			setActiveTagFilter: (tag) => {
				set((state) => {
					state.activeTagFilter = tag
				})
			},

			getAllTags: () => {
				const { tagIndex } = get()
				return Array.from(tagIndex.entries())
					.map(([tag, filePaths]) => ({ tag, filePaths: Array.from(filePaths) }))
					.sort((a, b) => b.filePaths.length - a.filePaths.length || a.tag.localeCompare(b.tag))
			},

			getTagsForFile: (filePath) => {
				return fileTagsCache.get(filePath) ?? []
			},

			getFilesForTag: (tag) => {
				const { tagIndex } = get()
				return Array.from(tagIndex.get(tag) ?? [])
			},
		})),
		{ name: "tagsStore" },
	),
)
