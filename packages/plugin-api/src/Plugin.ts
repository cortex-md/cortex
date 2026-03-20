import type {
	CodeBlockHandler,
	ContextMenuItemRegistration,
	Disposable,
	LivePreviewDeclaration,
	PluginAPI,
	PluginCommand,
	PluginManifest,
	RendererPlugin,
	RibbonActionRegistration,
	SettingsTabRegistration,
	SidebarItemRegistration,
	StatusBarItemRegistration,
	ViewRegistration,
} from "./types"

export abstract class CortexPlugin {
	manifest!: PluginManifest
	api!: PluginAPI

	private _disposables: Set<Disposable> = new Set()

	abstract onload(): void | Promise<void>

	onunload(): void | Promise<void> {}

	addCommand(command: PluginCommand): Disposable {
		const disposable = this.api.commands.register(command)
		this._disposables.add(disposable)
		return disposable
	}

	registerEditorExtension(extension: unknown): Disposable {
		const disposable = this.api.editor.registerExtension(extension)
		this._disposables.add(disposable)
		return disposable
	}

	registerLivePreview(declaration: LivePreviewDeclaration): Disposable {
		const disposable = this.api.editor.registerLivePreview(declaration)
		this._disposables.add(disposable)
		return disposable
	}

	registerMarkdownProcessor(plugin: RendererPlugin): Disposable {
		const disposable = this.api.renderer.registerPlugin(plugin)
		this._disposables.add(disposable)
		return disposable
	}

	registerCodeBlockProcessor(language: string, handler: CodeBlockHandler): Disposable {
		const disposable = this.api.renderer.registerCodeBlockProcessor(language, handler)
		this._disposables.add(disposable)
		return disposable
	}

	registerView(registration: ViewRegistration): Disposable {
		const disposable = this.api.ui.registerView(registration)
		this._disposables.add(disposable)
		return disposable
	}

	registerSidebarItem(item: SidebarItemRegistration): Disposable {
		const disposable = this.api.ui.registerSidebarItem(item)
		this._disposables.add(disposable)
		return disposable
	}

	registerStatusBarItem(item: StatusBarItemRegistration): Disposable {
		const disposable = this.api.ui.registerStatusBarItem(item)
		this._disposables.add(disposable)
		return disposable
	}

	registerSettingsTab(tab: SettingsTabRegistration): Disposable {
		const disposable = this.api.ui.registerSettingsTab(tab)
		this._disposables.add(disposable)

		for (const definition of tab.settings) {
			if (definition.onChange) {
				const onChangeDisposable = this.api.settings.onChange(definition.key, definition.onChange)
				this._disposables.add(onChangeDisposable)
			}
		}

		return disposable
	}

	registerContextMenuItem(item: ContextMenuItemRegistration): Disposable {
		const disposable = this.api.ui.registerContextMenuItem(item)
		this._disposables.add(disposable)
		return disposable
	}

	registerRibbonAction(action: RibbonActionRegistration): Disposable {
		const disposable = this.api.ui.registerRibbonAction(action)
		this._disposables.add(disposable)
		return disposable
	}

	_disposeAll(): void {
		try {
			for (const disposable of this._disposables) {
				try {
					disposable.dispose()
				} catch (_) {}
			}
		} finally {
			this._disposables.clear()
		}
	}
}
