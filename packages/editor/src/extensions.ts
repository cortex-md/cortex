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
import {
	drawSelection,
	dropCursor,
	EditorView,
	highlightActiveLine,
	keymap,
	lineNumbers,
} from "@codemirror/view"
import { buildHighlightStyle, type SyntaxTokens } from "./highlight"
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
	lineHeight: number
	wordWrap: boolean
	tabSize: number
	useSpaces: boolean
	showLineNumbers: boolean
}

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
	fontSize: 16,
	lineHeight: 1.5,
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

function typographyExtension(fontSize: number, lineHeight: number) {
	return EditorView.theme({
		"&": {
			fontSize: `var(--editor-font-size, ${fontSize}px)`,
			fontFamily: "var(--font-editor)",
			background: "transparent",
			height: "100%",
		},
		"&.cm-focused": { outline: "none" },
		".cm-scroller": { overflow: "auto", fontFamily: "inherit", lineHeight: String(lineHeight) },
		".cm-content": {
			padding: "24px 0",
			caretColor: "var(--accent)",
			maxWidth: "720px",
			marginInline: "auto",
		},
		".cm-line": { padding: "0 40px" },
		".cm-activeLine": {
			backgroundColor: "rgba(255,255,255,0.02)",
			padding: "0 40px",
		},
		".cm-cursor": {
			borderLeftColor: "var(--accent)",
			borderLeftWidth: "2px",
		},
		".cm-selectionBackground, ::selection": {
			backgroundColor: "color-mix(in srgb, var(--accent) 20%, transparent)",
		},
		".cm-gutters": {
			background: "transparent",
			borderRight: "none",
			color: "var(--text-muted)",
		},
	})
}

export interface BaseExtensionsOptions {
	livePreview?: boolean
	resolveImageUrl?: (src: string, filePath: string) => string
	filePath?: string
}

export function baseExtensions(
	syntaxTokens: SyntaxTokens,
	config: EditorConfig = DEFAULT_EDITOR_CONFIG,
	{ livePreview = true, resolveImageUrl, filePath }: BaseExtensionsOptions = {},
) {
	return [
		history(),
		drawSelection(),
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
		buildHighlightStyle(syntaxTokens),
		...(livePreview ? [livePreviewExtension(resolveImageUrl, filePath)] : []),
		markdown({
			base: markdownLanguage,
			codeLanguages,
		}),
		typographyCompartment.of(typographyExtension(config.fontSize, config.lineHeight)),
		lineWrappingCompartment.of(config.wordWrap ? EditorView.lineWrapping : []),
		indentCompartment.of(indentUnit.of(config.useSpaces ? " ".repeat(config.tabSize) : "\t")),
		lineNumbersCompartment.of(config.showLineNumbers ? lineNumbers() : []),
		pluginExtensionsCompartment.of([]),
	]
}

export function reconfigureEditor(view: EditorView, config: EditorConfig) {
	view.dispatch({
		effects: [
			typographyCompartment.reconfigure(typographyExtension(config.fontSize, config.lineHeight)),
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
