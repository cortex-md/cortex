import MiniSearch from "minisearch"
import { extractFrontmatter, stripMarkdown } from "./preprocessor"
import type { SearchDocument, SearchOptions, SearchResult } from "./types"

const SNIPPET_CONTEXT_CHARS = 60

function buildSnippet(content: string, query: string): string {
	if (!query.trim()) return content.slice(0, SNIPPET_CONTEXT_CHARS * 2)

	const lowerContent = content.toLowerCase()
	const terms = query.toLowerCase().split(/\s+/)
	let bestIndex = -1

	for (const term of terms) {
		const index = lowerContent.indexOf(term)
		if (index !== -1) {
			bestIndex = index
			break
		}
	}

	if (bestIndex === -1) return content.slice(0, SNIPPET_CONTEXT_CHARS * 2)

	const start = Math.max(0, bestIndex - SNIPPET_CONTEXT_CHARS)
	const end = Math.min(content.length, bestIndex + SNIPPET_CONTEXT_CHARS)
	let snippet = content.slice(start, end).replace(/\n/g, " ")

	if (start > 0) snippet = `...${snippet}`
	if (end < content.length) snippet = `${snippet}...`

	return snippet
}

export class SearchEngine {
	private miniSearch: MiniSearch<SearchDocument>

	constructor() {
		this.miniSearch = new MiniSearch<SearchDocument>({
			fields: ["title", "content", "tags", "aliases"],
			storeFields: ["title", "folder", "content", "tags"],
			searchOptions: {
				boost: { title: 3, aliases: 2, tags: 2, content: 1 },
				fuzzy: 0.2,
				prefix: true,
			},
		})
	}

	addDocument(id: string, title: string, rawContent: string, folder: string, mtime: number): void {
		const { tags, aliases, content: bodyContent } = extractFrontmatter(rawContent)
		const content = stripMarkdown(bodyContent)

		if (this.miniSearch.has(id)) {
			this.miniSearch.discard(id)
		}

		this.miniSearch.add({
			id,
			title,
			content,
			tags,
			aliases,
			folder,
			mtime,
		})
	}

	removeDocument(id: string): void {
		if (this.miniSearch.has(id)) {
			this.miniSearch.discard(id)
		}
	}

	search(query: string, options?: SearchOptions): SearchResult[] {
		if (!query.trim()) return []

		const searchOptions: Record<string, unknown> = {}

		const hasTagFilter = options?.tags && options.tags.length > 0

		if (options?.folder || hasTagFilter) {
			searchOptions.filter = (result: SearchDocument) => {
				if (options?.folder && !result.folder.startsWith(options.folder)) return false
				if (hasTagFilter) {
					const docTags = (result as unknown as { tags?: string[] }).tags ?? []
					const matchesTag = options.tags!.some((filterTag) =>
						docTags.some((docTag) => docTag.toLowerCase().includes(filterTag.toLowerCase())),
					)
					if (!matchesTag) return false
				}
				return true
			}
		}

		const raw = this.miniSearch.search(query, searchOptions)
		let results: SearchResult[] = raw.map((hit) => ({
			id: hit.id,
			title: (hit as unknown as { title: string }).title,
			folder: (hit as unknown as { folder: string }).folder,
			score: hit.score,
			matchedFields: Object.values(hit.match).flat(),
			snippet: buildSnippet((hit as unknown as { content: string }).content ?? "", query),
		}))

		if (options?.limit) {
			results = results.slice(0, options.limit)
		}

		return results
	}

	searchTitles(query: string): SearchResult[] {
		if (!query.trim()) return []

		const raw = this.miniSearch.search(query, {
			fields: ["title", "aliases"],
			fuzzy: 0.2,
			prefix: true,
		})

		return raw.map((hit) => ({
			id: hit.id,
			title: (hit as unknown as { title: string }).title,
			folder: (hit as unknown as { folder: string }).folder,
			score: hit.score,
			matchedFields: Object.values(hit.match).flat(),
			snippet: "",
		}))
	}

	serialize(): string {
		return JSON.stringify(this.miniSearch.toJSON())
	}

	deserialize(json: string): void {
		this.miniSearch = MiniSearch.loadJSON<SearchDocument>(json, {
			fields: ["title", "content", "tags", "aliases"],
			storeFields: ["title", "folder", "content", "tags"],
			searchOptions: {
				boost: { title: 3, aliases: 2, tags: 2, content: 1 },
				fuzzy: 0.2,
				prefix: true,
			},
		})
	}

	get documentCount(): number {
		return this.miniSearch.documentCount
	}
}
