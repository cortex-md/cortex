import type { FileEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { SearchEngine } from "./searchEngine"
import type { SearchOptions, SearchResult } from "./types"

const INDEX_FILE = ".cortex/search-index.json"
const SERIALIZE_DEBOUNCE_MS = 5000

interface SearchState {
	query: string
	results: SearchResult[]
	indexing: boolean
	documentCount: number

	setQuery: (query: string) => void
	search: (query: string, options?: SearchOptions) => void
	searchTitles: (query: string) => SearchResult[]
	indexVault: (vaultPath: string, files: FileEntry[]) => Promise<void>
	indexFile: (vaultPath: string, filePath: string) => Promise<void>
	removeFile: (vaultPath: string, filePath: string) => void
	reset: () => void
}

const engine = new SearchEngine()
let serializeTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSerialize(vaultPath: string) {
	if (serializeTimer) clearTimeout(serializeTimer)
	serializeTimer = setTimeout(async () => {
		try {
			const platform = getPlatform()
			await platform.fs.writeFile(`${vaultPath}/${INDEX_FILE}`, engine.serialize())
		} catch (_e) {}
	}, SERIALIZE_DEBOUNCE_MS)
}

function relativeId(filePath: string, vaultPath: string): string {
	return filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length + 1) : filePath
}

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

function folderFromId(relativeId: string): string {
	const parts = relativeId.split("/")
	return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

export const useSearchStore = create<SearchState>()(
	devtools(
		(set, get) => ({
			query: "",
			results: [],
			indexing: false,
			documentCount: 0,

			setQuery: (query) => {
				set({ query })
				get().search(query)
			},

			search: (query, options) => {
				const results = engine.search(query, options)
				set({ results, query })
			},

			searchTitles: (query) => {
				return engine.searchTitles(query)
			},

			indexVault: async (vaultPath, files) => {
				set({ indexing: true })
				const platform = getPlatform()

				try {
					const indexPath = `${vaultPath}/${INDEX_FILE}`
					const indexJson = await platform.fs.readFile(indexPath)
					engine.deserialize(indexJson)
				} catch (_e) {}

				const mdFiles = files.filter((f) => !f.isDir && f.path.endsWith(".md"))

				for (const file of mdFiles) {
					const id = relativeId(file.path, vaultPath)

					try {
						const content = await platform.fs.readFile(file.path)
						engine.addDocument(
							id,
							titleFromPath(file.path),
							content,
							folderFromId(id),
							file.mtime ?? 0,
						)
					} catch (_e) {}
				}

				set({ indexing: false, documentCount: engine.documentCount })
				scheduleSerialize(vaultPath)
			},

			indexFile: async (vaultPath, filePath) => {
				if (!filePath.endsWith(".md")) return
				const platform = getPlatform()
				const id = relativeId(filePath, vaultPath)

				try {
					const content = await platform.fs.readFile(filePath)
					engine.addDocument(id, titleFromPath(filePath), content, folderFromId(id), 0)
					set({ documentCount: engine.documentCount })
					scheduleSerialize(vaultPath)
				} catch (_e) {
					engine.removeDocument(id)
					set({ documentCount: engine.documentCount })
				}
			},

			removeFile: (vaultPath, filePath) => {
				const id = relativeId(filePath, vaultPath)
				engine.removeDocument(id)
				set({ documentCount: engine.documentCount })
				scheduleSerialize(vaultPath)
			},

			reset: () => {
				if (serializeTimer) clearTimeout(serializeTimer)
				set({ query: "", results: [], indexing: false, documentCount: 0 })
			},
		}),
		{ name: "searchStore" },
	),
)
