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
export { type DevicesState, useDevicesStore } from "./stores/devicesStore"
export {
	type DragPosition,
	type DragSource,
	type DragSourceType,
	type DragState,
	type DropTarget,
	type DropTargetType,
	type DropZone,
	type FileDragSource,
	type SidebarViewDragSource,
	type TabDragSource,
	useDragStore,
} from "./stores/dragStore"
export {
	type CursorPosition,
	type EditorMode,
	type EditorState,
	useEditorStore,
} from "./stores/editorStore"
export { type MembersState, useMembersStore } from "./stores/membersStore"
export {
	createDefaultSyncConfig,
	DEFAULT_SYNC_SERVER_URL,
	normalizeSyncConfig,
	type RemoteVaultState,
	useRemoteVaultStore,
} from "./stores/remoteVaultStore"
export {
	type SyncLogEntry,
	type SyncLogLevel,
	type SyncLogState,
	useSyncLogStore,
} from "./stores/syncLogStore"
export {
	createDefaultSyncPreferences,
	isSyncImagePath,
	normalizeSyncPathPattern,
	normalizeSyncPreferences,
	type SyncState,
	shouldIgnoreSyncPath,
	useSyncStore,
} from "./stores/syncStore"
export {
	type TagColor,
	type TagEntry,
	type TagsState,
	useTagsStore,
} from "./stores/tagsStore"
export {
	clampLeftSidebarWidth,
	LEFT_SIDEBAR_WIDTH_BOUNDS,
	type LeftSidebarLayout,
	type LeftSidebarView,
	type MarketplaceTab,
	type UIState,
	useUIStore,
} from "./stores/uiStore"
export {
	useVaultStore,
	type VaultMetadata,
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
	type TabType,
	useWorkspaceStore,
	type ViewTabState,
	type WorkspaceState,
} from "./stores/workspaceStore"
export type {
	SyncPluginEntry,
	SyncPluginsManifest,
	SyncThemeEntry,
	SyncThemesManifest,
} from "./types/syncMetadata"
export {
	getNotePathPresentation,
	getPortableFileNameError,
	type NotePathPresentation,
	type NotePathSegment,
} from "./utils/fileName"
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
export {
	generatePluginMetadata,
	generateThemeMetadata,
	readSyncPluginMetadata,
	readSyncThemeMetadata,
	writeSyncPluginMetadata,
	writeSyncThemeMetadata,
} from "./utils/syncMetadata"
