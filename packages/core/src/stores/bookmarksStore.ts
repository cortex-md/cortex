import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

const BOOKMARKS_FILE = ".cortex/bookmarks.json"

export interface BookmarksState {
	bookmarks: string[]

	loadBookmarks: (vaultPath: string) => Promise<void>
	addBookmark: (vaultPath: string, filePath: string) => Promise<void>
	removeBookmark: (vaultPath: string, filePath: string) => Promise<void>
	renameBookmark: (vaultPath: string, oldPath: string, newPath: string) => Promise<void>
	isBookmarked: (filePath: string) => boolean
	reorderBookmark: (vaultPath: string, fromIndex: number, toIndex: number) => Promise<void>
	reset: () => void
}

async function persistBookmarks(vaultPath: string, bookmarks: string[]) {
	const platform = getPlatform()
	await platform.fs.writeFile(`${vaultPath}/${BOOKMARKS_FILE}`, JSON.stringify(bookmarks, null, 2))
}

export const useBookmarksStore = create<BookmarksState>()(
	devtools(
		immer((set, get) => ({
			bookmarks: [],

			loadBookmarks: async (vaultPath) => {
				const platform = getPlatform()
				try {
					const raw = await platform.fs.readFile(`${vaultPath}/${BOOKMARKS_FILE}`)
					const parsed = JSON.parse(raw) as string[]
					set({ bookmarks: parsed })
				} catch (_e) {
					set({ bookmarks: [] })
				}
			},

			addBookmark: async (vaultPath, filePath) => {
				const { bookmarks } = get()
				if (bookmarks.includes(filePath)) return
				const updated = [...bookmarks, filePath]
				set({ bookmarks: updated })
				await persistBookmarks(vaultPath, updated)
			},

			removeBookmark: async (vaultPath, filePath) => {
				const { bookmarks } = get()
				const updated = bookmarks.filter((b) => b !== filePath)
				set({ bookmarks: updated })
				await persistBookmarks(vaultPath, updated)
			},

			renameBookmark: async (vaultPath, oldPath, newPath) => {
				const { bookmarks } = get()
				if (!bookmarks.includes(oldPath)) return
				const updated = bookmarks.map((bookmark) => (bookmark === oldPath ? newPath : bookmark))
				set({ bookmarks: updated })
				await persistBookmarks(vaultPath, updated)
			},

			isBookmarked: (filePath) => {
				return get().bookmarks.includes(filePath)
			},

			reorderBookmark: async (vaultPath, fromIndex, toIndex) => {
				const { bookmarks } = get()
				const updated = [...bookmarks]
				const [moved] = updated.splice(fromIndex, 1)
				updated.splice(toIndex, 0, moved)
				set({ bookmarks: updated })
				await persistBookmarks(vaultPath, updated)
			},

			reset: () => {
				set({ bookmarks: [] })
			},
		})),
		{ name: "bookmarksStore" },
	),
)
