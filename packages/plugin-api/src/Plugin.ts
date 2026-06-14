import type {
	CalloutTypeRegistration,
	ContextMenuItemRegistration,
	Disposable,
	MarkdownInlineRegistration,
	MarkdownProcessorRegistration,
	MarkdownSemanticRegistration,
	PluginAPI,
	PluginCommand,
	PluginManifest,
	PluginNotification,
	PluginNotificationResult,
	PluginPropertyTypeRegistration,
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

	registerMarkdownInline(registration: MarkdownInlineRegistration): Disposable {
		const disposable = this.api.markdown.registerInline(registration)
		this._disposables.add(disposable)
		return disposable
	}

	registerMarkdownSemantic(registration: MarkdownSemanticRegistration): Disposable {
		const disposable = this.api.markdown.registerSemantic(registration)
		this._disposables.add(disposable)
		return disposable
	}

	registerCalloutType(registration: CalloutTypeRegistration): Disposable {
		const disposable = this.api.markdown.registerCalloutType(registration)
		this._disposables.add(disposable)
		return disposable
	}

	registerMarkdownProcessor(processor: MarkdownProcessorRegistration): Disposable {
		const disposable = this.api.markdown.registerProcessor(processor)
		this._disposables.add(disposable)
		return disposable
	}

	registerPropertyType(registration: PluginPropertyTypeRegistration): Disposable {
		const disposable = this.api.properties.registerType(registration)
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

	notify(notification: PluginNotification): Promise<PluginNotificationResult> {
		return this.api.notifications.send(notification)
	}

	_disposeAll(): void {
		try {
			for (const disposable of this._disposables) {
				try {
					disposable.dispose()
				} catch (error) {
					console.error("[Plugin disposal failed]", {
						pluginId: this.manifest.id,
						error,
					})
				}
			}
		} finally {
			this._disposables.clear()
		}
	}
}
