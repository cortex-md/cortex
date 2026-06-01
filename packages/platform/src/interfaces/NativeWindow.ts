export interface OpenSettingsWindowOptions {
	section?: string | null
	marketplaceTab?: "plugins" | "themes"
	vaultPath?: string | null
	vaultName?: string | null
}

export interface NativeWindow {
	openSettings(options?: OpenSettingsWindowOptions): Promise<void>
	closeCurrent(): Promise<void>
	focusMain(): Promise<void>
}
