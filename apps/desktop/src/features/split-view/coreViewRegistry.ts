import type { ComponentType } from "react"
import { BookmarksSidebar } from "../bookmarks/BookmarksSidebar"
import { FileSidebar } from "../file-explorer/FileSidebar"
import { SearchSidebar } from "../search/SearchSidebar"
import { TagsSidebar } from "../tags/TagsSidebar"

const CORE_VIEW_COMPONENTS: Record<string, ComponentType> = {
	files: FileSidebar,
	search: SearchSidebar,
	bookmarks: BookmarksSidebar,
	tags: TagsSidebar,
}

export function getCoreViewComponent(viewId: string): ComponentType | null {
	return CORE_VIEW_COMPONENTS[viewId] ?? null
}
