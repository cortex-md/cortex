import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { noteCache } from "../noteCache"
import { addTagToFrontmatter, extractAllTags, removeTagFromFrontmatter } from "../utils/frontmatter"

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
	fileTags: Record<string, string[]>
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

const TAG_COLORS_FILE = ".cortex/tags.json"

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
			fileTags: {},
			activeTagFilter: null,

			buildIndex: async (_vaultPath, filePaths) => {
				const platform = getPlatform()
				const newTagIndex: Record<string, string[]> = {}
				const fileTags: Record<string, string[]> = {}

				const mdFilePaths = filePaths.filter((p) => p.endsWith(".md"))

				for (const filePath of mdFilePaths) {
					try {
						const content = await platform.fs.readFile(filePath)
						const tags = extractAllTags(content)
						fileTags[filePath] = tags

						for (const tag of tags) {
							if (!newTagIndex[tag]) newTagIndex[tag] = []
							if (!newTagIndex[tag].includes(filePath)) {
								newTagIndex[tag].push(filePath)
							}
						}
					} catch (_e) {}
				}

				set({ tagIndex: newTagIndex, fileTags })
			},

			updateFileInIndex: (filePath, rawContent) => {
				const previousTags = get().fileTags[filePath] ?? []
				const updatedTags = extractAllTags(rawContent)

				const { fileTags, tagIndex } = get()
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

				set({
					tagIndex: newIndex,
					fileTags: { ...fileTags, [filePath]: updatedTags },
				})
			},

			removeFileFromIndex: (filePath) => {
				const { fileTags, tagIndex } = get()
				const previousTags = fileTags[filePath] ?? []
				const nextFileTags = { ...fileTags }
				delete nextFileTags[filePath]

				const newIndex = { ...tagIndex }

				for (const tag of previousTags) {
					if (newIndex[tag]) {
						newIndex[tag] = newIndex[tag].filter((p) => p !== filePath)
						if (newIndex[tag].length === 0) delete newIndex[tag]
					}
				}

				set({ tagIndex: newIndex, fileTags: nextFileTags })
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
				return get().fileTags[filePath] ?? []
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
				const entry = noteCache.getEntry(filePath)
				const platform = getPlatform()
				const content = entry ? entry.content : await platform.fs.readFile(filePath)
				const updated = addTagToFrontmatter(content, tag)
				if (updated === content) return

				if (entry) {
					noteCache.writeExternal(filePath, updated)
				} else {
					await platform.fs.writeFile(filePath, updated)
				}
				get().updateFileInIndex(filePath, updated)
			},

			removeTagFromFile: async (filePath, tag) => {
				const entry = noteCache.getEntry(filePath)
				const platform = getPlatform()
				const content = entry ? entry.content : await platform.fs.readFile(filePath)
				const updated = removeTagFromFrontmatter(content, tag)
				if (updated === content) return

				if (entry) {
					noteCache.writeExternal(filePath, updated)
				} else {
					await platform.fs.writeFile(filePath, updated)
				}
				get().updateFileInIndex(filePath, updated)
			},
		}),
		{ name: "tagsStore" },
	),
)
