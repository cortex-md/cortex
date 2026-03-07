import type { AppearanceSettings, AppSettings, EditorSettings } from "@cortex/settings"
import { useSettingsStore } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"
import { Button, Input, Toggle } from "@cortex/ui"
import { Keyboard, type LucideIcon, Palette, Settings, Type, X } from "lucide-react"
import { useState } from "react"

interface SettingsTab {
	id: string
	label: string
	icon: LucideIcon
}

const SETTINGS_TABS: SettingsTab[] = [
	{ id: "general", label: "General", icon: Settings },
	{ id: "appearance", label: "Appearance", icon: Palette },
	{ id: "editor", label: "Editor", icon: Type },
	{ id: "hotkeys", label: "Hotkeys", icon: Keyboard },
]

interface Props {
	onClose: () => void
}

type UpdateSettingFn = <K extends keyof AppSettings>(
	section: K,
	key: keyof AppSettings[K],
	value: unknown,
) => void

export function SettingsModal({ onClose }: Props) {
	const [activeSection, setActiveSection] = useState("appearance")
	const { settings, updateSetting } = useSettingsStore()

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: modal overlay dismiss
		<div className="settings-modal-overlay" onClick={onClose} role="presentation">
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation only */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stopPropagation only */}
			<div className="settings-modal" onClick={(e) => e.stopPropagation()}>
				<div className="settings-header">
					<h2>Settings</h2>
					<Button
						variant="ghost"
						size="sm"
						className="settings-close"
						onClick={onClose}
						aria-label="Close settings"
					>
						<X size={20} />
					</Button>
				</div>

				<div className="settings-body">
					<nav className="settings-nav">
						{SETTINGS_TABS.map((tab) => {
							const Icon = tab.icon
							return (
								<Button
									key={tab.id}
									variant="ghost"
									className={`settings-nav-item ${activeSection === tab.id ? "active" : ""}`}
									onClick={() => setActiveSection(tab.id)}
								>
									<Icon size={16} />
									<span>{tab.label}</span>
								</Button>
							)
						})}
					</nav>

					<main className="settings-content">
						{activeSection === "general" && <GeneralSection />}
						{activeSection === "appearance" && (
							<AppearanceSection settings={settings.appearance} onUpdate={updateSetting} />
						)}
						{activeSection === "editor" && (
							<EditorSection settings={settings.editor} onUpdate={updateSetting} />
						)}
						{activeSection === "hotkeys" && <HotkeysSection />}
					</main>
				</div>
			</div>
		</div>
	)
}

function GeneralSection() {
	return (
		<section>
			<h3>General Settings</h3>
			<p className="settings-info">Vault-specific general settings will appear here.</p>
		</section>
	)
}

function HotkeysSection() {
	return (
		<section>
			<h3>Hotkeys</h3>
			<p className="settings-info">Keyboard shortcut customization coming soon.</p>
		</section>
	)
}

interface AppearanceSectionProps {
	settings: AppearanceSettings
	onUpdate: UpdateSettingFn
}

function AppearanceSection({ settings, onUpdate }: AppearanceSectionProps) {
	const handleThemeChange = (themeName: "paper" | "ink") => {
		getThemeManager().setActiveTheme(themeName)
		onUpdate("appearance", "theme", themeName)
	}

	return (
		<section>
			<div className="settings-section-group">
				<h3>Theme</h3>
				<div className="settings-option">
					<span>Theme</span>
					<div className="theme-buttons">
						<Button
							variant={settings.theme === "paper" ? "primary" : "secondary"}
							onClick={() => handleThemeChange("paper")}
						>
							Light (Paper)
						</Button>
						<Button
							variant={settings.theme === "ink" ? "primary" : "secondary"}
							onClick={() => handleThemeChange("ink")}
						>
							Dark (Ink)
						</Button>
					</div>
				</div>
			</div>

			<div className="settings-section-group">
				<h3>Text</h3>
				<div className="settings-option">
					<label htmlFor="font-size">Font Size</label>
					<div className="settings-input-row">
						<input
							id="font-size"
							type="range"
							min="12"
							max="24"
							value={settings.fontSize}
							onChange={(e) =>
								onUpdate("appearance", "fontSize", Number.parseInt(e.target.value, 10))
							}
							className="settings-slider"
						/>
						<span className="settings-value">{settings.fontSize}px</span>
					</div>
				</div>

				<div className="settings-option">
					<label htmlFor="line-height">Line Height</label>
					<div className="settings-input-row">
						<input
							id="line-height"
							type="range"
							min="1.2"
							max="2"
							step="0.1"
							value={settings.lineHeight}
							onChange={(e) =>
								onUpdate("appearance", "lineHeight", Number.parseFloat(e.target.value))
							}
							className="settings-slider"
						/>
						<span className="settings-value">{settings.lineHeight}x</span>
					</div>
				</div>
			</div>
		</section>
	)
}

interface EditorSectionProps {
	settings: EditorSettings
	onUpdate: UpdateSettingFn
}

function EditorSection({ settings, onUpdate }: EditorSectionProps) {
	return (
		<section>
			<div className="settings-section-group">
				<h3>Indentation</h3>
				<div className="settings-option">
					<label htmlFor="tab-size">Tab Size</label>
					<Input
						id="tab-size"
						type="number"
						min="1"
						max="8"
						value={settings.tabSize}
						onChange={(e) => onUpdate("editor", "tabSize", Number.parseInt(e.target.value, 10))}
					/>
				</div>

				<div className="settings-option">
					<Toggle
						checked={settings.useSpaces}
						onChange={(checked) => onUpdate("editor", "useSpaces", checked)}
						label="Use spaces instead of tabs"
					/>
				</div>
			</div>

			<div className="settings-section-group">
				<h3>Editor Behavior</h3>
				<div className="settings-option">
					<Toggle
						checked={settings.wordWrap}
						onChange={(checked) => onUpdate("editor", "wordWrap", checked)}
						label="Word wrap"
					/>
				</div>

				<div className="settings-option">
					<Toggle
						checked={settings.showLineNumbers}
						onChange={(checked) => onUpdate("editor", "showLineNumbers", checked)}
						label="Show line numbers"
					/>
				</div>

				<div className="settings-option">
					<Toggle
						checked={settings.autoSave}
						onChange={(checked) => onUpdate("editor", "autoSave", checked)}
						label="Auto-save"
					/>
				</div>
			</div>
		</section>
	)
}
