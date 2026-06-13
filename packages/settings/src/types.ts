import { z } from "zod"

export const AppearanceSettingsSchema = z.object({
	theme: z.string().default("default"),
	colorscheme: z.enum(["light", "dark", "system"]).default("system"),
	accentColor: z.string().default("#e8a83c"),
	uiFontFamily: z.string().default("System Default"),
	uiFontSize: z.number().min(10).max(24).default(14),
	editorFontFamily: z.string().default("System Default"),
	editorFontSize: z.number().min(10).max(24).default(16),
	lineHeight: z.number().min(1).max(2).default(1.5),
})

export const EditorSettingsSchema = z.object({
	tabSize: z.number().min(2).max(8).default(2),
	useSpaces: z.boolean().default(true),
	wordWrap: z.boolean().default(true),
	showLineNumbers: z.boolean().default(true),
	vimMode: z.boolean().default(false),
	autoSave: z.boolean().default(true),
	autoSaveInterval: z.number().min(1000).default(2000),
	imageStorageLocation: z.enum(["root", "same", "custom"]).default("same"),
	imageStorageCustomPath: z.string().default(""),
})

export const FilesSettingsSchema = z.object({
	excludePatterns: z.array(z.string()).default(["node_modules", ".git", "dist"]),
	hideHiddenFiles: z.boolean().default(true),
})

export const GeneralSettingsSchema = z.object({
	autoOpenLastVault: z.boolean().default(true),
})

export const HotkeysSettingsSchema = z.record(z.string(), z.string()).default({})

export const AppSettingsSchema = z.object({
	general: GeneralSettingsSchema.default({}),
	appearance: AppearanceSettingsSchema.default({}),
	editor: EditorSettingsSchema.default({}),
	files: FilesSettingsSchema.default({}),
	hotkeys: HotkeysSettingsSchema.default({}),
})

export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>
export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>
export type EditorSettings = z.infer<typeof EditorSettingsSchema>
export type FilesSettings = z.infer<typeof FilesSettingsSchema>
export type HotkeysSettings = z.infer<typeof HotkeysSettingsSchema>
export type AppSettings = z.infer<typeof AppSettingsSchema>

export interface SettingsChangeEvent {
	section: keyof AppSettings
	key: string
	oldValue: unknown
	newValue: unknown
}
