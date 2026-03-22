import { Compartment } from "@codemirror/state"
import type { EditorView, KeyBinding } from "@codemirror/view"
import { keymap } from "@codemirror/view"
import {
	insertCodeBlock,
	insertImage,
	insertLink,
	insertTable,
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

export interface FormatBinding {
	id: string
	keys: string
	enabled: boolean
}

const markdownCommandMap: Record<string, (view: EditorView) => boolean> = {
	"format.bold": toggleBold,
	"format.italic": toggleItalic,
	"format.strikethrough": toggleStrikethrough,
	"format.inline-code": toggleInlineCode,
	"format.link": insertLink,
	"format.image": insertImage,
	"format.heading-1": (v) => toggleHeading(v, 1),
	"format.heading-2": (v) => toggleHeading(v, 2),
	"format.heading-3": (v) => toggleHeading(v, 3),
	"format.blockquote": toggleBlockquote,
	"format.code-block": insertCodeBlock,
	"format.task-list": toggleTaskList,
	"format.unordered-list": toggleUnorderedList,
	"format.ordered-list": toggleOrderedList,
	"format.table": insertTable,
}

function hotkeyToCM6Key(hotkey: string): string {
	return hotkey
		.split("+")
		.map((part, index, parts) => {
			if (index === parts.length - 1) return part
			if (part === "mod") return "Mod"
			return part.charAt(0).toUpperCase() + part.slice(1)
		})
		.join("-")
}

function buildMarkdownKeymap(bindings: FormatBinding[]): KeyBinding[] {
	return bindings
		.filter((b) => b.enabled && b.id in markdownCommandMap)
		.map((b) => ({
			key: hotkeyToCM6Key(b.keys),
			run: markdownCommandMap[b.id],
		}))
}

export const defaultMarkdownBindings: FormatBinding[] = [
	{ id: "format.bold", keys: "mod+b", enabled: true },
	{ id: "format.italic", keys: "mod+i", enabled: true },
	{ id: "format.strikethrough", keys: "mod+shift+x", enabled: true },
	{ id: "format.inline-code", keys: "mod+`", enabled: true },
	{ id: "format.link", keys: "mod+k", enabled: true },
	{ id: "format.image", keys: "mod+shift+k", enabled: true },
	{ id: "format.heading-1", keys: "mod+alt+1", enabled: true },
	{ id: "format.heading-2", keys: "mod+alt+2", enabled: true },
	{ id: "format.heading-3", keys: "mod+alt+3", enabled: true },
	{ id: "format.blockquote", keys: "mod+shift+.", enabled: true },
	{ id: "format.code-block", keys: "mod+shift+`", enabled: true },
	{ id: "format.task-list", keys: "mod+l", enabled: true },
	{ id: "format.unordered-list", keys: "mod+shift+l", enabled: true },
	{ id: "format.ordered-list", keys: "mod+shift+o", enabled: true },
	{ id: "format.table", keys: "mod+shift+y", enabled: true },
]

export const markdownKeymapCompartment = new Compartment()

export function defaultMarkdownKeymapExtension() {
	return markdownKeymapCompartment.of(keymap.of(buildMarkdownKeymap(defaultMarkdownBindings)))
}

export function reconfigureMarkdownKeymap(view: EditorView, bindings: FormatBinding[]): void {
	view.dispatch({
		effects: markdownKeymapCompartment.reconfigure(keymap.of(buildMarkdownKeymap(bindings))),
	})
}
