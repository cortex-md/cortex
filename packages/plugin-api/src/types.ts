export interface Disposable {
	dispose(): void
}

export type PluginCapability =
	| "vault:read"
	| "vault:write"
	| "vault:delete"
	| "vault:watch"
	| "editor:extensions"
	| "markdown:extensions"
	| "ui:views"
	| "ui:sidebar"
	| "ui:statusbar"
	| "ui:contextmenu"
	| "commands"
	| "hotkeys"
	| "settings"
	| "themes"
	| "bookmarks:read"
	| "bookmarks:write"
	| "notifications"

export interface PluginManifest {
	id: string
	name: string
	version: string
	minAppVersion: string
	author: string
	authorUrl?: string
	description: string
	icon: string
	main: string
	capabilities?: PluginCapability[]
}

export interface PluginCommand {
	id: string
	label: string
	category?: string
	icon?: string
	shortcut?: string
	defaultHotkey?: string
	execute: () => void | Promise<void>
}

export interface PluginHotkeyBinding {
	id: string
	label: string
	defaultBinding: string
	execute: () => void | Promise<void>
}

export type PluginNotificationPermissionState = "granted" | "denied" | "prompt" | "unsupported"

export type PluginNotificationKind = "info" | "success" | "warning" | "error"

export type PluginNotificationUrgency = "low" | "normal" | "high"

export type PluginNotificationIcon =
	| { type: "app" }
	| { type: "lucide"; name: string }
	| { type: "asset"; path: string }

export type PluginNotificationSound =
	| { type: "default" }
	| { type: "system"; name: string }
	| { type: "asset"; path: string }

export interface PluginNotification {
	id?: string
	title: string
	body?: string
	kind?: PluginNotificationKind
	icon?: PluginNotificationIcon
	sound?: PluginNotificationSound
	tag?: string
	silent?: boolean
	urgency?: PluginNotificationUrgency
	metadata?: Record<string, string | number | boolean | null>
}

export type PluginNotificationFailureReason =
	| "missing-capability"
	| "unsupported"
	| "permission-denied"
	| "rate-limited"
	| "invalid"
	| "failed"

export interface PluginNotificationResult {
	delivered: boolean
	reason?: PluginNotificationFailureReason
}

export interface FileEntry {
	path: string
	name: string
	isDir: boolean
	size?: number
	mtime?: number
}

export interface VaultFileEvent {
	type: "create" | "modify" | "delete" | "rename"
	path: string
	oldPath?: string
}

export interface PluginSettingDefinition {
	key: string
	label: string
	description?: string
	type: "text" | "number" | "boolean" | "select" | "slider" | "color" | "folder-path"
	default: unknown
	options?: { value: string; label: string }[]
	min?: number
	max?: number
	step?: number
	placeholder?: string
	onChange?: (newValue: unknown, oldValue: unknown) => void
}

export interface SettingsTabRegistration {
	id: string
	label: string
	icon: string
	settings: PluginSettingDefinition[]
}

export type ViewNodeType =
	| "stack"
	| "row"
	| "text"
	| "heading"
	| "button"
	| "input"
	| "toggle"
	| "select"
	| "icon"
	| "separator"
	| "list"
	| "list-item"
	| "scroll-area"
	| "badge"
	| "progress"
	| "empty"
	| "markdown"

export interface ViewNode {
	type: ViewNodeType
	props?: Record<string, unknown>
	children?: ViewDescriptor
}

export type ViewDescriptor = ViewNode | ViewNode[]

export interface ViewState {
	state: Record<string, unknown>
}

export type ViewDispatch = (action: string, payload?: unknown) => void

export interface ViewRegistration {
	id: string
	label: string
	icon: string
	location: "tab" | "sidebar-left" | "sidebar-right" | "modal"
	render: (state: ViewState, dispatch: ViewDispatch) => ViewDescriptor
	initialState?: Record<string, unknown>
	reduce?: (
		state: Record<string, unknown>,
		action: string,
		payload?: unknown,
	) => Record<string, unknown>
}

export interface SidebarItemRegistration {
	id: string
	label: string
	icon: string
	viewId: string
}

export interface StatusBarItemRegistration {
	id: string
	position: "left" | "right"
	text?: string
	icon?: string
	tooltip?: string
	onClick?: () => void
}

export interface ContextMenuItemRegistration {
	id: string
	label: string
	icon?: string
	context: "file" | "editor" | "tab"
	action: () => void | Promise<void>
}

export interface RibbonActionRegistration {
	id: string
	label: string
	icon: string
	onClick: () => void
}

export type MarkdownInlineReplacement =
	| { type: "text"; content: string | ((match: RegExpExecArray) => string) }
	| { type: "mark"; className: string }

export interface MarkdownInlineRegistration {
	id: string
	pattern: string
	flags?: string
	priority?: number
	replacement: MarkdownInlineReplacement
}

export type MarkdownSurface = "reading-view" | "export"

export type MarkdownSemanticSurface = MarkdownSurface | "live-preview"

export type MarkdownProcessorPhase = "remark" | "rehype"

export interface MarkdownUnifiedNode {
	type: string
	children?: MarkdownUnifiedNode[]
	[property: string]: unknown
}

export interface MarkdownUnifiedFile {
	data: Record<string, unknown>
	path?: string
	value: unknown
	[property: string]: unknown
}

export type MarkdownUnifiedTransformer = (
	tree: MarkdownUnifiedNode,
	file: MarkdownUnifiedFile,
) => unknown

export type MarkdownUnifiedPlugin = () => MarkdownUnifiedTransformer | undefined

export type MarkdownPortableNode =
	| { type: "text"; value: string }
	| { type: "container"; children: readonly MarkdownPortableNode[] }
	| { type: "span"; className?: string; children: readonly MarkdownPortableNode[] }
	| { type: "link"; href: string; children: readonly MarkdownPortableNode[] }
	| { type: "image"; src: string; alt: string }
	| { type: "code"; value: string; language?: string }

export interface MarkdownNodeSelector {
	type: "text"
}

export interface MarkdownSemanticContext {
	surface: MarkdownSemanticSurface
	node: MarkdownPortableNode
	source: string
}

export interface MarkdownSemanticRegistration {
	id: string
	selector: MarkdownNodeSelector
	priority?: number
	transform: (
		context: MarkdownSemanticContext,
	) => MarkdownPortableNode | readonly MarkdownPortableNode[] | null
}

export interface CalloutTypeRegistration {
	type: string
	aliases?: string[]
	label?: string
	color?: string
	backgroundColor?: string
}

export interface MarkdownProcessorRegistration {
	id: string
	phase: MarkdownProcessorPhase
	surfaces: readonly MarkdownSurface[]
	priority?: number
	processor: MarkdownUnifiedPlugin
}

export interface TagEntry {
	tag: string
	count: number
}

export interface Theme {
	id: string
	name: string
	type: "light" | "dark"
	colors: Record<string, string>
}

export type WorkspaceOpenTarget = "active" | "left" | "right" | "top" | "bottom"

export interface WorkspaceOpenOptions {
	target?: WorkspaceOpenTarget
	newTab?: boolean
}

export interface PluginAPI {
	commands: {
		register(command: PluginCommand): Disposable
		execute(commandId: string): boolean
	}

	settings: {
		load(): Promise<void>
		get<T>(key: string): T | undefined
		set<T>(key: string, value: T): Promise<void>
		getAll(): Record<string, unknown>
		onChange(key: string, callback: (value: unknown, oldValue: unknown) => void): Disposable
		defineSchema(schema: PluginSettingDefinition[]): void
	}

	vault: {
		getVaultPath(): string | null
		readFile(relativePath: string): Promise<string>
		writeFile(relativePath: string, content: string): Promise<void>
		deleteFile(relativePath: string): Promise<void>
		listFiles(dir?: string): Promise<FileEntry[]>
		exists(relativePath: string): Promise<boolean>
		onFileEvent(callback: (event: VaultFileEvent) => void): Disposable
	}

	editor: {
		registerExtension(extension: unknown): Disposable
		getActiveFilePath(): string | null
		getActiveFileContent(): string | null
		insertAtCursor(text: string): void
		replaceSelection(text: string): void
	}

	markdown: {
		registerInline(registration: MarkdownInlineRegistration): Disposable
		registerSemantic(registration: MarkdownSemanticRegistration): Disposable
		registerProcessor(processor: MarkdownProcessorRegistration): Disposable
		registerCalloutType(registration: CalloutTypeRegistration): Disposable
	}

	ui: {
		registerView(registration: ViewRegistration): Disposable
		registerSidebarItem(item: SidebarItemRegistration): Disposable
		registerStatusBarItem(item: StatusBarItemRegistration): Disposable
		registerContextMenuItem(item: ContextMenuItemRegistration): Disposable
		registerSettingsTab(tab: SettingsTabRegistration): Disposable
		registerRibbonAction(action: RibbonActionRegistration): Disposable
		showNotice(message: string, duration?: number): void
	}

	notifications: {
		isSupported(): boolean
		getPermission(): Promise<PluginNotificationPermissionState>
		send(notification: PluginNotification): Promise<PluginNotificationResult>
	}

	hotkeys: {
		register(binding: PluginHotkeyBinding): Disposable
	}

	metadata: {
		getFrontmatter(path: string): Promise<Record<string, unknown> | null>
		getTags(path: string): Promise<string[]>
		getAllTags(): TagEntry[]
	}

	data: {
		read(filename: string): Promise<string | null>
		write(filename: string, content: string): Promise<void>
		delete(filename: string): Promise<void>
		getDataPath(): string
	}

	theme: {
		register(theme: Theme): Disposable
		getActiveThemeName(): string
		onThemeChange(callback: (name: string) => void): Disposable
	}

	workspace: {
		openFile(path: string, options?: WorkspaceOpenOptions): void
		openView(viewId: string, options?: WorkspaceOpenOptions): void
		getOpenFiles(): string[]
		onActiveFileChange(callback: (path: string | null) => void): Disposable
	}

	bookmarks: {
		getAll(): string[]
		add(filePath: string): Promise<void>
		remove(filePath: string): Promise<void>
		isBookmarked(filePath: string): boolean
		onChange(callback: (bookmarks: string[]) => void): Disposable
	}
}
