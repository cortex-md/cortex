export { type CursorInfo, EditorView } from "./EditorView"
export {
	baseExtensions,
	DEFAULT_EDITOR_CONFIG,
	type EditorConfig,
	readonlyExtension,
	reconfigureEditor,
} from "./extensions"
export { buildHighlightStyle, resolveSyntaxTokens, type SyntaxTokens } from "./highlight"
export { getLanguageSupport } from "./languages"
export { livePreviewExtension } from "./livePreview"
