import "./markdown.css"

export {
	type CalloutTypeDefinition,
	getCalloutRegistryVersion,
	getCalloutTypes,
	subscribeCalloutTypes,
} from "@cortex/renderer"
export { type ClipboardImageHandler, clipboardImageExtension } from "./clipboardImage"
export { type CursorInfo, EditorView } from "./EditorView"
export {
	type BaseExtensionsOptions,
	baseExtensions,
	DEFAULT_EDITOR_CONFIG,
	type EditorConfig,
	readonlyExtension,
	reconfigureEditor,
	reconfigurePluginExtensions,
} from "./extensions"
export { buildHighlightStyle } from "./highlight"
export { getLanguageSupport } from "./languages"
export { livePreviewExtension } from "./livePreview"
export {
	copyLine,
	duplicateLine,
	insertCallout,
	insertCodeBlock,
	insertImage,
	insertLink,
	insertTable,
	removeParagraphFormatting,
	toggleBlockquote,
	toggleBold,
	toggleHeading,
	toggleInlineCode,
	toggleItalic,
	toggleOrderedList,
	toggleStrikethrough,
	toggleTaskList,
	toggleUnorderedList,
} from "./markdownCommands"
export {
	defaultMarkdownBindings,
	defaultMarkdownKeymapExtension,
	type FormatBinding,
	markdownKeymapCompartment,
	reconfigureMarkdownKeymap,
} from "./markdownKeymap"
export { ReadingView } from "./ReadingView"
export { SideBySideView } from "./SideBySideView"
