import type { EditorView } from "@codemirror/view"
import {
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
} from "@cortex/editor"
import { getPlatform } from "@cortex/platform"
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@cortex/ui"
import type { ReactNode } from "react"
import { useCallback, useRef } from "react"
import type { MenuItem } from "@/utils/context-menu"
import { NativeMenuActions } from "@/utils/context-menu"

const isNativePlatform = getPlatform().capabilities.includes("menu")
const nativeMenu = new NativeMenuActions()

interface Props {
	getEditorView: () => EditorView | null
	children: ReactNode
}

function runCommand(view: EditorView | null, command: (v: EditorView) => boolean) {
	if (!view) return
	command(view)
	view.focus()
}

function buildNativeMenuItems(view: EditorView, hasSelection: boolean): MenuItem[] {
	const items: MenuItem[] = [
		{
			id: "turn-into",
			type: "submenu",
			text: "Turn into",
			items: [
				{
					id: "turn-text",
					text: "Text",
					action: () => runCommand(view, removeParagraphFormatting),
				},
				{ type: "separator" },
				{
					id: "turn-h1",
					text: "Heading 1",
					accelerator: "CmdOrCtrl+Alt+1",
					action: () => runCommand(view, (v) => toggleHeading(v, 1)),
				},
				{
					id: "turn-h2",
					text: "Heading 2",
					accelerator: "CmdOrCtrl+Alt+2",
					action: () => runCommand(view, (v) => toggleHeading(v, 2)),
				},
				{
					id: "turn-h3",
					text: "Heading 3",
					accelerator: "CmdOrCtrl+Alt+3",
					action: () => runCommand(view, (v) => toggleHeading(v, 3)),
				},
				{ type: "separator" },
				{
					id: "turn-blockquote",
					text: "Blockquote",
					accelerator: "CmdOrCtrl+Shift+.",
					action: () => runCommand(view, toggleBlockquote),
				},
				{
					id: "turn-code-block",
					text: "Code Block",
					action: () => runCommand(view, insertCodeBlock),
				},
				{ type: "separator" },
				{
					id: "turn-task-list",
					text: "Task List",
					accelerator: "CmdOrCtrl+L",
					action: () => runCommand(view, toggleTaskList),
				},
				{
					id: "turn-unordered-list",
					text: "Unordered List",
					accelerator: "CmdOrCtrl+Shift+L",
					action: () => runCommand(view, toggleUnorderedList),
				},
				{
					id: "turn-ordered-list",
					text: "Ordered List",
					accelerator: "CmdOrCtrl+Shift+O",
					action: () => runCommand(view, toggleOrderedList),
				},
			],
		},
	]

	if (hasSelection) {
		items.push(
			{ type: "separator" },
			{
				id: "format-bold",
				text: "Bold",
				accelerator: "CmdOrCtrl+B",
				action: () => runCommand(view, toggleBold),
			},
			{
				id: "format-italic",
				text: "Italic",
				accelerator: "CmdOrCtrl+I",
				action: () => runCommand(view, toggleItalic),
			},
			{
				id: "format-strikethrough",
				text: "Strikethrough",
				accelerator: "CmdOrCtrl+Shift+X",
				action: () => runCommand(view, toggleStrikethrough),
			},
			{
				id: "format-inline-code",
				text: "Inline Code",
				action: () => runCommand(view, toggleInlineCode),
			},
			{
				id: "format-link",
				text: "Link",
				accelerator: "CmdOrCtrl+K",
				action: () => runCommand(view, insertLink),
			},
		)
	}

	items.push(
		{ type: "separator" },
		{
			id: "insert-link",
			text: "Insert Link",
			accelerator: "CmdOrCtrl+K",
			action: () => runCommand(view, insertLink),
		},
		{
			id: "insert-image",
			text: "Insert Image",
			accelerator: "CmdOrCtrl+Shift+K",
			action: () => runCommand(view, insertImage),
		},
		{
			id: "insert-table",
			text: "Insert Table",
			accelerator: "CmdOrCtrl+Shift+Y",
			action: () => runCommand(view, insertTable),
		},
		{
			id: "insert-callout",
			text: "Insert Callout",
			action: () => runCommand(view, insertCallout),
		},
		{ type: "separator" },
		{
			id: "copy-line",
			text: "Copy Line",
			action: () => runCommand(view, copyLine),
		},
		{
			id: "duplicate-line",
			text: "Duplicate Line",
			action: () => runCommand(view, duplicateLine),
		},
	)

	return items
}

export function EditorContextMenu({ getEditorView, children }: Props) {
	const capturedViewRef = useRef<EditorView | null>(null)

	const handleNativeContextMenu = useCallback(
		(event: React.MouseEvent) => {
			event.preventDefault()
			const view = getEditorView()
			if (!view) return

			const hasSelection = !view.state.selection.main.empty
			const items = buildNativeMenuItems(view, hasSelection)

			nativeMenu.showContextMenu({
				items,
				position: { x: event.clientX, y: event.clientY },
			})
		},
		[getEditorView],
	)

	const handleRadixContextMenuOpen = useCallback(() => {
		capturedViewRef.current = getEditorView()
	}, [getEditorView])

	if (isNativePlatform) {
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: editor wrapper intercepts context menu for native menu
			<div onContextMenu={handleNativeContextMenu}>{children}</div>
		)
	}

	const view = capturedViewRef.current
	const hasSelection = view ? !view.state.selection.main.empty : false

	return (
		<ContextMenu onOpenChange={(open) => open && handleRadixContextMenuOpen()}>
			<ContextMenuTrigger asChild>
				<div>{children}</div>
			</ContextMenuTrigger>
			<ContextMenuContent className="w-56">
				<ContextMenuSub>
					<ContextMenuSubTrigger>Turn into</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuItem onSelect={() => runCommand(view, removeParagraphFormatting)}>
							Text
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => runCommand(view, (v) => toggleHeading(v, 1))}>
							Heading 1<ContextMenuShortcut>⌘⌥1</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, (v) => toggleHeading(v, 2))}>
							Heading 2<ContextMenuShortcut>⌘⌥2</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, (v) => toggleHeading(v, 3))}>
							Heading 3<ContextMenuShortcut>⌘⌥3</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => runCommand(view, toggleBlockquote)}>
							Blockquote<ContextMenuShortcut>⌘⇧.</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, insertCodeBlock)}>
							Code Block
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => runCommand(view, toggleTaskList)}>
							Task List<ContextMenuShortcut>⌘L</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, toggleUnorderedList)}>
							Unordered List<ContextMenuShortcut>⌘⇧L</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, toggleOrderedList)}>
							Ordered List<ContextMenuShortcut>⌘⇧O</ContextMenuShortcut>
						</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>

				{hasSelection && (
					<>
						<ContextMenuSeparator />
						<ContextMenuLabel>Format</ContextMenuLabel>
						<ContextMenuItem onSelect={() => runCommand(view, toggleBold)}>
							Bold<ContextMenuShortcut>⌘B</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, toggleItalic)}>
							Italic<ContextMenuShortcut>⌘I</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, toggleStrikethrough)}>
							Strikethrough<ContextMenuShortcut>⌘⇧X</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, toggleInlineCode)}>
							Inline Code<ContextMenuShortcut>⌘`</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem onSelect={() => runCommand(view, insertLink)}>
							Link<ContextMenuShortcut>⌘K</ContextMenuShortcut>
						</ContextMenuItem>
					</>
				)}

				<ContextMenuSeparator />
				<ContextMenuLabel>Insert</ContextMenuLabel>
				<ContextMenuItem onSelect={() => runCommand(view, insertLink)}>
					Link<ContextMenuShortcut>⌘K</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem onSelect={() => runCommand(view, insertImage)}>
					Image<ContextMenuShortcut>⌘⇧K</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem onSelect={() => runCommand(view, insertTable)}>
					Table<ContextMenuShortcut>⌘⇧Y</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem onSelect={() => runCommand(view, insertCallout)}>Callout</ContextMenuItem>

				<ContextMenuSeparator />
				<ContextMenuItem onSelect={() => runCommand(view, copyLine)}>Copy Line</ContextMenuItem>
				<ContextMenuItem onSelect={() => runCommand(view, duplicateLine)}>
					Duplicate Line
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	)
}
