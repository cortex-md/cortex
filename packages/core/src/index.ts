export {
	type ExternalChangeEvent,
	type NoteCacheEntry,
	noteCache,
	type Snapshot,
	type SnapshotTrigger,
} from "./noteCache"
export { type AppState, useAppStore } from "./stores/appStore"
export { type AuthState, useAuthStore } from "./stores/authStore"
export { type BookmarksState, useBookmarksStore } from "./stores/bookmarksStore"
export {
	type CursorPosition,
	type EditorMode,
	type EditorState,
	useEditorStore,
} from "./stores/editorStore"
export {
	type TagColor,
	type TagEntry,
	type TagsState,
	useTagsStore,
} from "./stores/tagsStore"
export { type SyncState, useSyncStore } from "./stores/syncStore"
export { type LeftSidebarView, type UIState, useUIStore } from "./stores/uiStore"
export {
	useVaultStore,
	type VaultRegistryEntry,
	type VaultState,
} from "./stores/vaultStore"
export {
	type LeafNode,
	type OpenTabOptions,
	type Pane,
	type SplitDirection,
	type SplitNode,
	type SplitTree,
	type Tab,
	useWorkspaceStore,
	type WorkspaceState,
} from "./stores/workspaceStore"
export {
	addTagToFrontmatter,
	createDefaultFrontmatter,
	extractAllTags,
	extractInlineTags,
	extractYamlArray,
	type Frontmatter,
	hasFrontmatter,
	type ParsedNote,
	parseFrontmatter,
	removeTagFromFrontmatter,
	updateFrontmatterField,
} from "./utils/frontmatter"
