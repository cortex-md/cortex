import type { PluginAPI, TagEntry } from "@cortex/plugin-api"

type ParseFrontmatterFn = (content: string) => { frontmatter: Record<string, unknown> | null }
type ExtractAllTagsFn = (content: string) => string[]
type GetAllTagsFn = () => { tag: string; filePaths: string[] }[]
type ReadFileFn = (path: string) => Promise<string>

let parseFrontmatterFn: ParseFrontmatterFn | null = null
let extractAllTagsFn: ExtractAllTagsFn | null = null
let getAllTagsFn: GetAllTagsFn | null = null
let readFileFn: ReadFileFn | null = null

export function setMetadataFunctions(fns: {
	parseFrontmatter: ParseFrontmatterFn
	extractAllTags: ExtractAllTagsFn
	getAllTags: GetAllTagsFn
	readFile: ReadFileFn
}): void {
	parseFrontmatterFn = fns.parseFrontmatter
	extractAllTagsFn = fns.extractAllTags
	getAllTagsFn = fns.getAllTags
	readFileFn = fns.readFile
}

export function createMetadataAPI(): PluginAPI["metadata"] {
	return {
		async getFrontmatter(path: string): Promise<Record<string, unknown> | null> {
			if (!readFileFn || !parseFrontmatterFn) return null
			try {
				const content = await readFileFn(path)
				const parsed = parseFrontmatterFn(content)
				return parsed.frontmatter
			} catch {
				return null
			}
		},

		async getTags(path: string): Promise<string[]> {
			if (!readFileFn || !extractAllTagsFn) return []
			try {
				const content = await readFileFn(path)
				return extractAllTagsFn(content)
			} catch {
				return []
			}
		},

		getAllTags(): TagEntry[] {
			if (!getAllTagsFn) return []
			return getAllTagsFn().map((entry) => ({
				tag: entry.tag,
				count: entry.filePaths.length,
			}))
		},
	}
}
