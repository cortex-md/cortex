import { useUIStore } from "@cortex/core"
import type { FontInfo } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import type { AppearanceSettings } from "@cortex/settings"
import { getThemeManager, type ThemeFamily, type ThemeTokens } from "@cortex/theme"
import {
	Button,
	ColorPicker,
	type ColorPickerOption,
	Label,
	NativeSelect,
	NativeSelectOption,
	Slider,
} from "@cortex/ui"
import { Store } from "lucide-react"
import { useEffect, useState } from "react"
import type { UpdateSettingFn } from "."
import { applyAppearanceSettings, buildAppearanceOverrides } from "./applyAppearance"

interface AppearanceSectionProps {
	settings: AppearanceSettings
	onUpdate: UpdateSettingFn
}

function uniqueColorOptions(options: ColorPickerOption[]): ColorPickerOption[] {
	const seen = new Set<string>()
	return options.filter((option) => {
		const value = option.value.toLowerCase()
		if (seen.has(value)) return false
		seen.add(value)
		return true
	})
}

function buildAccentColorOptions(systemAccentColor: string | null = null): ColorPickerOption[] {
	const tokens = getThemeManager().getActiveTheme().tokens as Partial<ThemeTokens>
	const semantic = tokens.semantic
	const status = tokens.status

	if (!semantic || !status) return [{ value: "#e8a83c", label: "Default accent" }]

	return uniqueColorOptions([
		...(systemAccentColor ? [{ value: systemAccentColor, label: "System accent" }] : []),
		{ value: semantic.accent.default, label: "Theme accent" },
		{ value: status.success, label: "Success" },
		{ value: status.warning, label: "Warning" },
		{ value: status.error, label: "Error" },
		{ value: semantic.syntax.string, label: "String" },
		{ value: semantic.syntax.function, label: "Function" },
		{ value: semantic.syntax.property, label: "Property" },
		{ value: semantic.text.muted, label: "Muted" },
	])
}

export function AppearanceSection({ settings, onUpdate }: AppearanceSectionProps) {
	const [systemFonts, setSystemFonts] = useState<FontInfo[]>([])
	const [themeFamilies, setThemeFamilies] = useState<ThemeFamily[]>([])
	const [accentColorOptions, setAccentColorOptions] = useState<ColorPickerOption[]>([])
	const [systemAccentColor, setSystemAccentColor] = useState<string | null>(null)
	const openMarketplace = useUIStore((s) => s.openMarketplace)

	useEffect(() => {
		getPlatform().font.listSystemFonts().then(setSystemFonts)
	}, [])

	useEffect(() => {
		getPlatform()
			.appearance.getSnapshot()
			.then((snapshot) => setSystemAccentColor(snapshot.accentColor))
			.catch(() => setSystemAccentColor(null))
		const unsubscribeAppearance = getPlatform().appearance.subscribe((snapshot) => {
			setSystemAccentColor(snapshot.accentColor)
		})
		return unsubscribeAppearance
	}, [])

	useEffect(() => {
		const themeManager = getThemeManager()
		const refreshThemeOptions = () => {
			setThemeFamilies(themeManager.getThemeFamilies())
			setAccentColorOptions(buildAccentColorOptions(systemAccentColor))
		}
		refreshThemeOptions()
		const unsubscribe = themeManager.subscribe(() => {
			refreshThemeOptions()
		})
		return unsubscribe
	}, [systemAccentColor])

	const applyOverrides = (partial: Partial<AppearanceSettings>) => {
		getThemeManager().applyOverrides(buildAppearanceOverrides({ ...settings, ...partial }))
	}

	const handleThemeChange = (theme: string) => {
		onUpdate("appearance", "theme", theme)
		applyAppearanceSettings({ ...settings, theme })
		setAccentColorOptions(buildAccentColorOptions(systemAccentColor))
	}

	const handleColorschemeChange = (colorscheme: "light" | "dark" | "system") => {
		onUpdate("appearance", "colorscheme", colorscheme)
		applyAppearanceSettings({ ...settings, colorscheme })
		setAccentColorOptions(buildAccentColorOptions(systemAccentColor))
	}

	const handleAccentColorChange = (hex: string) => {
		onUpdate("appearance", "accentColor", hex)
		applyOverrides({ accentColor: hex })
	}

	const handleUIFontFamilyChange = (fontFamily: string) => {
		onUpdate("appearance", "uiFontFamily", fontFamily)
		applyOverrides({ uiFontFamily: fontFamily })
	}

	const handleUIFontSizeChange = (size: number) => {
		onUpdate("appearance", "uiFontSize", size)
		applyOverrides({ uiFontSize: size })
	}

	const handleEditorFontFamilyChange = (fontFamily: string) => {
		onUpdate("appearance", "editorFontFamily", fontFamily)
		applyOverrides({ editorFontFamily: fontFamily })
	}

	const handleEditorFontSizeChange = (size: number) => {
		onUpdate("appearance", "editorFontSize", size)
		applyOverrides({ editorFontSize: size })
	}

	const handleLineHeightChange = (lineHeight: number) => {
		onUpdate("appearance", "lineHeight", lineHeight)
		applyOverrides({ lineHeight })
	}

	return (
		<section>
			<div className="mb-6">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[10px] font-bold m-0 text-text-muted uppercase tracking-wide">
						Theme
					</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => openMarketplace("themes")}
						className="text-xs h-6 px-2 gap-1.5"
					>
						<Store size={12} />
						Browse themes
					</Button>
				</div>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="theme">Theme</Label>
					<NativeSelect
						id="theme"
						value={settings.theme}
						onChange={(e) => handleThemeChange(e.target.value)}
					>
						{themeFamilies.map((family) => (
							<NativeSelectOption key={family.name} value={family.name}>
								{family.displayName}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="colorscheme">Colorscheme</Label>
					<NativeSelect
						id="colorscheme"
						value={settings.colorscheme}
						onChange={(e) => handleColorschemeChange(e.target.value as "light" | "dark" | "system")}
					>
						<NativeSelectOption value="light">Light</NativeSelectOption>
						<NativeSelectOption value="dark">Dark</NativeSelectOption>
						<NativeSelectOption value="system">System</NativeSelectOption>
					</NativeSelect>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="accent-color">Accent Color</Label>
					<ColorPicker
						customInputId="accent-color"
						value={settings.accentColor}
						options={accentColorOptions}
						allowClear={false}
						customLabel="Accent Color"
						onChange={(color) => {
							if (color) handleAccentColorChange(color)
						}}
						className="max-w-[240px] items-end"
					/>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Interface
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="ui-font-family">UI Font</Label>
					<NativeSelect
						id="ui-font-family"
						value={settings.uiFontFamily}
						onChange={(e) => handleUIFontFamilyChange(e.target.value)}
					>
						<NativeSelectOption value="System Default">System Default</NativeSelectOption>
						{systemFonts.map((font) => (
							<NativeSelectOption key={font.family} value={font.family}>
								{font.family}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="ui-font-size">UI Font Size</Label>
					<div className="flex items-center gap-3 flex-1">
						<Slider
							id="ui-font-size"
							min={10}
							max={20}
							defaultValue={[settings.uiFontSize]}
							onValueChange={(value: number[]) => handleUIFontSizeChange(value[0])}
							className="flex-1 h-1 accent-color-accent"
						/>
						<span className="text-[11px] text-text-muted min-w-[36px] text-right font-family-mono">
							{settings.uiFontSize}px
						</span>
					</div>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Editor
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="editor-font-family">Editor Font</Label>
					<NativeSelect
						id="editor-font-family"
						value={settings.editorFontFamily}
						onChange={(e) => handleEditorFontFamilyChange(e.target.value)}
					>
						<NativeSelectOption value="System Default">System Default</NativeSelectOption>
						{systemFonts.map((font) => (
							<NativeSelectOption key={font.family} value={font.family}>
								{font.family}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="editor-font-size">Editor Font Size</Label>
					<div className="flex items-center gap-3 flex-1">
						<Slider
							id="editor-font-size"
							min={12}
							max={24}
							defaultValue={[settings.editorFontSize]}
							onValueChange={(value: number[]) => handleEditorFontSizeChange(value[0])}
							className="flex-1 h-1 accent-color-accent"
						/>
						<span className="text-[11px] text-text-muted min-w-[36px] text-right font-family-mono">
							{settings.editorFontSize}px
						</span>
					</div>
				</div>

				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="line-height">Line Height</Label>
					<div className="flex items-center gap-3 flex-1">
						<Slider
							id="line-height"
							min={1.2}
							max={2}
							step={0.1}
							defaultValue={[settings.lineHeight]}
							onValueChange={(value: number[]) => handleLineHeightChange(value[0])}
							className="flex-1 h-1 accent-color-accent"
						/>
						<span className="text-[11px] text-text-muted min-w-[36px] text-right font-family-mono">
							{settings.lineHeight}x
						</span>
					</div>
				</div>
			</div>
		</section>
	)
}
