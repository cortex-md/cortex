import type { KeyBinding } from "@codemirror/view"
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

export const markdownKeymapBindings: KeyBinding[] = [
	{ key: "Mod-b", run: toggleBold },
	{ key: "Mod-i", run: toggleItalic },
	{ key: "Mod-Shift-x", run: toggleStrikethrough },
	{ key: "Mod-`", run: toggleInlineCode },
	{ key: "Mod-k", run: insertLink },
	{ key: "Mod-Shift-k", run: insertImage },
	{ key: "Mod-Alt-1", run: (v) => toggleHeading(v, 1) },
	{ key: "Mod-Alt-2", run: (v) => toggleHeading(v, 2) },
	{ key: "Mod-Alt-3", run: (v) => toggleHeading(v, 3) },
	{ key: "Mod-Shift-.", run: toggleBlockquote },
	{ key: "Mod-Shift-`", run: insertCodeBlock },
	{ key: "Mod-l", run: toggleTaskList },
	{ key: "Mod-Shift-l", run: toggleUnorderedList },
	{ key: "Mod-Shift-o", run: toggleOrderedList },
	{ key: "Mod-Shift-y", run: insertTable },
]
