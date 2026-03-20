import type { Disposable, PluginAPI } from "cortex-plugin-api"

interface BookmarksFunctions {
	getAll: () => string[]
	add: (filePath: string) => Promise<void>
	remove: (filePath: string) => Promise<void>
	isBookmarked: (filePath: string) => boolean
	subscribe: (callback: (bookmarks: string[]) => void) => () => void
}

let bookmarksFns: BookmarksFunctions | null = null

export function setBookmarksFunctions(fns: BookmarksFunctions): void {
	bookmarksFns = fns
}

export function createBookmarksAPI(): PluginAPI["bookmarks"] {
	return {
		getAll(): string[] {
			return bookmarksFns?.getAll() ?? []
		},

		async add(filePath: string): Promise<void> {
			await bookmarksFns?.add(filePath)
		},

		async remove(filePath: string): Promise<void> {
			await bookmarksFns?.remove(filePath)
		},

		isBookmarked(filePath: string): boolean {
			return bookmarksFns?.isBookmarked(filePath) ?? false
		},

		onChange(callback: (bookmarks: string[]) => void): Disposable {
			const unsubscribe = bookmarksFns?.subscribe(callback)
			return {
				dispose() {
					unsubscribe?.()
				},
			}
		},
	}
}
