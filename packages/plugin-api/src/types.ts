export interface Disposable {
	dispose(): void
}

export type PluginCapability =
	| "vault:read"
	| "vault:write"
	| "vault:delete"
	| "vault:watch"
	| "editor:extensions"
	| "renderer:plugins"
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

export interface LivePreviewWidgetDescriptor {
	tag: string
	textContent?: string
	className?: string
	attributes?: Record<string, string>
}

export type LivePreviewReplacement =
	| { type: "text"; content: string | ((match: RegExpExecArray) => string) }
	| { type: "widget"; render: (match: RegExpExecArray) => LivePreviewWidgetDescriptor }
	| { type: "mark"; className: string }

export interface LivePreviewInlineRule {
	pattern: string
	flags?: string
	replacement: LivePreviewReplacement
}

export interface LivePreviewDeclaration {
	id: string
	inlineRules?: LivePreviewInlineRule[]
	cursorAware?: boolean
}

export type CodeBlockHandler = (content: string, container: ViewDescriptor) => ViewDescriptor

export interface RendererPlugin {
	name: string
	remarkPlugins?: unknown[]
	rehypePlugins?: unknown[]
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
		registerLivePreview(declaration: LivePreviewDeclaration): Disposable
		getActiveFilePath(): string | null
		getActiveFileContent(): string | null
		insertAtCursor(text: string): void
		replaceSelection(text: string): void
	}

	renderer: {
		registerPlugin(plugin: RendererPlugin): Disposable
		registerCodeBlockProcessor(language: string, handler: CodeBlockHandler): Disposable
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
		openFile(path: string): void
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
