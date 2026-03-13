import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface BacklinksState {
	forwardLinks: Map<string, Set<string>>
	backLinks: Map<string, Set<string>>

	buildIndex: (vaultPath: string, filePaths: string[]) => Promise<void>
	updateFile: (vaultPath: string, filePath: string) => Promise<void>
	removeFile: (filePath: string) => void
	getBacklinks: (filePath: string) => string[]
	getForwardLinks: (filePath: string) => string[]
	reset: () => void
}

function extractWikiLinks(content: string): string[] {
	const matches = content.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
	if (!matches) return []
	return [...new Set(matches.map((m) => m.replace(/^\[\[/, "").replace(/(?:\|.*?)?\]\]$/, "")))]
}

function resolveLink(linkTarget: string, vaultPath: string, filePaths: string[]): string | null {
	const normalized = linkTarget.trim()
	if (!normalized) return null

	for (const fp of filePaths) {
		const relative = fp.replace(`${vaultPath}/`, "")
		const withoutExt = relative.replace(/\.md$/, "")
		const fileName = relative.split("/").pop()?.replace(/\.md$/, "") ?? ""

		if (withoutExt === normalized || fileName === normalized) {
			return fp
		}
	}

	return null
}

export const useBacklinksStore = create<BacklinksState>()(
	devtools(
		immer((set, get) => ({
			forwardLinks: new Map(),
			backLinks: new Map(),

			buildIndex: async (vaultPath, filePaths) => {
				const platform = getPlatform()
				const newForward = new Map<string, Set<string>>()
				const newBack = new Map<string, Set<string>>()

				const mdFiles = filePaths.filter((p) => p.endsWith(".md"))

				for (const filePath of mdFiles) {
					try {
						const content = await platform.fs.readFile(filePath)
						const links = extractWikiLinks(content)
						const resolved = links
							.map((link) => resolveLink(link, vaultPath, mdFiles))
							.filter((p): p is string => p !== null)

						if (resolved.length > 0) {
							newForward.set(filePath, new Set(resolved))
						}

						for (const target of resolved) {
							if (!newBack.has(target)) newBack.set(target, new Set())
							newBack.get(target)!.add(filePath)
						}
					} catch (_e) {}
				}

				set((state) => {
					state.forwardLinks = newForward
					state.backLinks = newBack
				})
			},

			updateFile: async (vaultPath, filePath) => {
				const platform = getPlatform()
				try {
					const content = await platform.fs.readFile(filePath)
					const { forwardLinks, backLinks } = get()
					const allFiles = Array.from(
						new Set([
							...forwardLinks.keys(),
							...Array.from(backLinks.values()).flatMap((s) => [...s]),
						]),
					)
					const mdFiles = [...new Set([...allFiles, filePath])]

					const oldTargets = forwardLinks.get(filePath) ?? new Set()

					set((state) => {
						for (const target of oldTargets) {
							state.backLinks.get(target)?.delete(filePath)
							if (state.backLinks.get(target)?.size === 0) {
								state.backLinks.delete(target)
							}
						}
					})

					const links = extractWikiLinks(content)
					const resolved = links
						.map((link) => resolveLink(link, vaultPath, mdFiles))
						.filter((p): p is string => p !== null)

					set((state) => {
						if (resolved.length > 0) {
							state.forwardLinks.set(filePath, new Set(resolved))
						} else {
							state.forwardLinks.delete(filePath)
						}

						for (const target of resolved) {
							if (!state.backLinks.has(target)) state.backLinks.set(target, new Set())
							state.backLinks.get(target)!.add(filePath)
						}
					})
				} catch (_e) {}
			},

			removeFile: (filePath) => {
				const { forwardLinks } = get()
				const targets = forwardLinks.get(filePath) ?? new Set()

				set((state) => {
					for (const target of targets) {
						state.backLinks.get(target)?.delete(filePath)
						if (state.backLinks.get(target)?.size === 0) {
							state.backLinks.delete(target)
						}
					}
					state.forwardLinks.delete(filePath)
				})
			},

			getBacklinks: (filePath) => {
				return Array.from(get().backLinks.get(filePath) ?? [])
			},

			getForwardLinks: (filePath) => {
				return Array.from(get().forwardLinks.get(filePath) ?? [])
			},

			reset: () => {
				set((state) => {
					state.forwardLinks = new Map()
					state.backLinks = new Map()
				})
			},
		})),
		{ name: "backlinksStore" },
	),
)
