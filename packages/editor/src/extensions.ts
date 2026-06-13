import { autocompletion, closeBrackets } from "@codemirror/autocomplete"
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands"
import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown, markdownLanguage } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { rust } from "@codemirror/lang-rust"
import { sql } from "@codemirror/lang-sql"
import { yaml } from "@codemirror/lang-yaml"
import {
	bracketMatching,
	indentOnInput,
	indentUnit,
	LanguageDescription,
} from "@codemirror/language"
import { search, searchKeymap } from "@codemirror/search"
import { Compartment, EditorState } from "@codemirror/state"
import { dropCursor, EditorView, highlightActiveLine, keymap, lineNumbers } from "@codemirror/view"
import { GFM } from "@lezer/markdown"
import type { EditorScrollMode } from "./EditorView"
import { buildHighlightStyle } from "./highlight"
import { livePreviewExtension } from "./livePreview"
import { defaultMarkdownKeymapExtension } from "./markdownKeymap"

const codeLanguages = [
	LanguageDescription.of({ name: "JavaScript", alias: ["js"], load: async () => javascript() }),
	LanguageDescription.of({
		name: "TypeScript",
		alias: ["ts"],
		load: async () => javascript({ typescript: true }),
	}),
	LanguageDescription.of({
		name: "JSX",
		alias: ["jsx"],
		load: async () => javascript({ jsx: true }),
	}),
	LanguageDescription.of({
		name: "TSX",
		alias: ["tsx"],
		load: async () => javascript({ jsx: true, typescript: true }),
	}),
	LanguageDescription.of({ name: "Python", alias: ["py"], load: async () => python() }),
	LanguageDescription.of({ name: "Rust", alias: ["rs"], load: async () => rust() }),
	LanguageDescription.of({ name: "HTML", load: async () => html() }),
	LanguageDescription.of({ name: "CSS", load: async () => css() }),
	LanguageDescription.of({ name: "JSON", load: async () => json() }),
	LanguageDescription.of({ name: "YAML", alias: ["yml"], load: async () => yaml() }),
	LanguageDescription.of({ name: "SQL", load: async () => sql() }),
]

export interface EditorConfig {
	fontSize: number
	wordWrap: boolean
	tabSize: number
	useSpaces: boolean
	showLineNumbers: boolean
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
	fontSize: 16,
	wordWrap: true,
	tabSize: 2,
	useSpaces: true,
	showLineNumbers: false,
}

const typographyCompartment = new Compartment()
const lineWrappingCompartment = new Compartment()
const indentCompartment = new Compartment()
const lineNumbersCompartment = new Compartment()
const pluginExtensionsCompartment = new Compartment()

export function buildEditorTypographyRules(
	fontSize: number,
	scrollMode: EditorScrollMode = "internal",
) {
	const usesParentScroll = scrollMode === "parent"
	return {
		"&": {
			fontSize: `var(--editor-font-size, ${fontSize}px)`,
			fontFamily:
				'var(--font-editor, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
			fontWeight: "var(--editor-font-weight, 400)",
			background: "transparent",
			height: usesParentScroll ? "auto" : "100%",
		},
		"&.cm-focused": { outline: "none" },
		".cm-scroller": {
			overflow: usesParentScroll ? "visible" : "auto",
			fontFamily: "inherit",
			lineHeight: "var(--editor-line-height, 27px)",
		},
		".cm-content": {
			padding: usesParentScroll ? "8px 0 24px" : "24px 0",
			caretColor: "var(--accent)",
			maxWidth: "var(--markdown-content-width, 720px)",
			marginInline: "auto",
		},
		".cm-line": { padding: "0 var(--markdown-content-gutter, 40px)" },
		".cm-activeLine": {
			backgroundColor: "rgba(255,255,255,0.02)",
			padding: "0 var(--markdown-content-gutter, 40px)",
		},
		".cm-cursor": {
			borderLeftColor: "var(--accent)",
			borderLeftWidth: "2px",
		},
		".cm-content ::selection": {
			backgroundColor: "var(--editor-selection-bg, var(--bg-selected))",
		},
		".cm-cursorLayer": {
			zIndex: "10",
			pointerEvents: "none",
		},
		".cm-gutters": {
			background: "transparent",
			borderRight: "none",
			color: "var(--text-muted)",
		},
		".cm-panels": {
			backgroundColor: "var(--bg-elevated)",
			color: "var(--text-primary)",
			fontFamily: "var(--font-ui)",
			fontSize: "var(--ui-font-size, 14px)",
		},
		".cm-panel.cm-search": {
			display: "flex",
			flexWrap: "wrap",
			alignItems: "center",
			gap: "6px",
			padding: "8px 40px 8px 10px",
			backgroundColor: "var(--bg-elevated)",
			borderBottom: "1px solid var(--border-subtle)",
			boxShadow: "var(--shadow-raised)",
			position: "relative",
		},
		".cm-panel.cm-search br": {
			display: "none",
		},
		".cm-panel.cm-search .cm-textfield": {
			height: "28px",
			minWidth: "180px",
			padding: "0 8px",
			color: "var(--text-primary)",
			backgroundColor: "var(--input-bg)",
			border: "1px solid var(--input-border)",
			borderRadius: "4px",
			font: "inherit",
			outline: "none",
		},
		".cm-panel.cm-search .cm-textfield:focus": {
			borderColor: "var(--border-focus)",
			boxShadow: "0 0 0 2px var(--input-focus-ring)",
		},
		".cm-panel.cm-search .cm-button": {
			height: "28px",
			padding: "0 9px",
			color: "var(--text-secondary)",
			backgroundImage: "none",
			backgroundColor: "var(--bg-secondary)",
			border: "1px solid var(--border-subtle)",
			borderRadius: "4px",
			font: "inherit",
			cursor: "default",
		},
		".cm-panel.cm-search .cm-button:hover": {
			color: "var(--text-primary)",
			backgroundColor: "var(--bg-hover)",
			borderColor: "var(--border)",
		},
		".cm-panel.cm-search label": {
			display: "inline-flex",
			alignItems: "center",
			gap: "4px",
			color: "var(--text-muted)",
			whiteSpace: "nowrap",
		},
		'.cm-panel.cm-search input[type="checkbox"]': {
			accentColor: "var(--accent)",
		},
		'.cm-panel.cm-search [name="close"]': {
			position: "absolute",
			top: "8px",
			right: "8px",
			width: "28px",
			height: "28px",
			padding: "0",
			color: "var(--text-muted)",
			background: "transparent",
			border: "none",
			borderRadius: "4px",
			fontSize: "18px",
			lineHeight: "28px",
			cursor: "default",
		},
		'.cm-panel.cm-search [name="close"]:hover': {
			color: "var(--text-primary)",
			backgroundColor: "var(--bg-hover)",
		},
		".cm-searchMatch": {
			backgroundColor: "var(--editor-search-match-bg, var(--accent-subtle))",
			outline: "1px solid var(--accent-border)",
		},
		".cm-searchMatch.cm-searchMatch-selected": {
			backgroundColor: "var(--editor-search-match-active-bg, var(--bg-selected))",
			outline: "1px solid var(--accent)",
		},
	}
}

function typographyExtension(fontSize: number, scrollMode: EditorScrollMode) {
	return EditorView.theme(buildEditorTypographyRules(fontSize, scrollMode))
}

export interface BaseExtensionsOptions {
	livePreview?: boolean
	resolveImageUrl?: (src: string, filePath: string) => string
	filePath?: string
	scrollMode?: EditorScrollMode
}

export function baseExtensions(
	config: EditorConfig = DEFAULT_EDITOR_CONFIG,
	{
		livePreview = true,
		resolveImageUrl,
		filePath,
		scrollMode = "internal",
	}: BaseExtensionsOptions = {},
) {
	return [
		history(),
		dropCursor(),
		indentOnInput(),
		bracketMatching(),
		closeBrackets(),
		autocompletion(),
		search({ top: true }),
		highlightActiveLine(),
		EditorState.allowMultipleSelections.of(true),
		keymap.of([indentWithTab, ...defaultKeymap, ...historyKeymap, ...searchKeymap]),
		defaultMarkdownKeymapExtension(),
		buildHighlightStyle(),
		...(livePreview ? [livePreviewExtension(resolveImageUrl, filePath)] : []),
		markdown({
			base: markdownLanguage,
			codeLanguages,
			extensions: GFM,
		}),
		typographyCompartment.of(typographyExtension(config.fontSize, scrollMode)),
		lineWrappingCompartment.of(config.wordWrap ? EditorView.lineWrapping : []),
		indentCompartment.of(indentUnit.of(config.useSpaces ? " ".repeat(config.tabSize) : "\t")),
		lineNumbersCompartment.of(config.showLineNumbers ? lineNumbers() : []),
		pluginExtensionsCompartment.of([]),
	]
}

export function reconfigureEditor(
	view: EditorView,
	config: EditorConfig,
	scrollMode: EditorScrollMode = "internal",
) {
	view.dispatch({
		effects: [
			typographyCompartment.reconfigure(typographyExtension(config.fontSize, scrollMode)),
			lineWrappingCompartment.reconfigure(config.wordWrap ? EditorView.lineWrapping : []),
			indentCompartment.reconfigure(
				indentUnit.of(config.useSpaces ? " ".repeat(config.tabSize) : "\t"),
			),
			lineNumbersCompartment.reconfigure(config.showLineNumbers ? lineNumbers() : []),
		],
	})
}

export function reconfigurePluginExtensions(view: EditorView, extensions: unknown[]) {
	view.dispatch({
		effects: [
			pluginExtensionsCompartment.reconfigure(
				extensions as import("@codemirror/state").Extension[],
			),
		],
	})
}

export function readonlyExtension() {
	return EditorState.readOnly.of(true)
}
