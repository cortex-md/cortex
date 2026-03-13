import type { Pane, Tab } from "@cortex/core"
import { noteCache, useEditorStore, useTagsStore, useWorkspaceStore } from "@cortex/core"
import type { CursorInfo, EditorConfig } from "@cortex/editor"
import { EditorView, ReadingView, SideBySideView } from "@cortex/editor"
import { getPlatform } from "@cortex/platform"
import { useSettingsStore } from "@cortex/settings"
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	Kbd,
} from "@cortex/ui"
import { ClipboardCopyIcon, FolderIcon, PinIcon, PinOffIcon, TagIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import type { MenuItem } from "@/utils/context-menu"
import { NativeMenuActions } from "@/utils/context-menu"

import { TabBar } from "../tabs/TabBar"

const hasNativeMenu = () => getPlatform().capabilities.includes("menu")
const nativeMenu = new NativeMenuActions()

function useEditorConfig(): EditorConfig {
	const { settings } = useSettingsStore()
	return useMemo(
		() => ({
			fontSize: settings.appearance.editorFontSize,
			lineHeight: settings.appearance.lineHeight,
			wordWrap: settings.editor.wordWrap,
			tabSize: settings.editor.tabSize,
			useSpaces: settings.editor.useSpaces,
			showLineNumbers: settings.editor.showLineNumbers,
		}),
		[
			settings.appearance.editorFontSize,
			settings.appearance.lineHeight,
			settings.editor.wordWrap,
			settings.editor.tabSize,
			settings.editor.useSpaces,
			settings.editor.showLineNumbers,
		],
	)
}

interface TabEditorProps {
	tab: Tab
	paneId: string
	isActive: boolean
	editorConfig: EditorConfig
	onCursorChange: (cursor: CursorInfo) => void
}

function TabEditor({ tab, paneId, isActive, editorConfig, onCursorChange }: TabEditorProps) {
	const [content, setContent] = useState<string | null>(null)
	const { markTabDirty } = useWorkspaceStore()
	const mode = useEditorStore((s) => s.mode)

	useEffect(() => {
		noteCache.read(tab.filePath).then(setContent)
	}, [tab.filePath])

	const handleChange = useCallback(
		(newContent: string) => {
			noteCache.write(tab.filePath, newContent)
			markTabDirty(tab.id, true)
		},
		[tab.filePath, tab.id, markTabDirty],
	)

	return (
		<div
			className="absolute inset-0 flex flex-col"
			style={{ display: isActive ? "flex" : "none" }}
			aria-hidden={!isActive}
		>
			{tab.isSuspended ? (
				<Button
					variant="ghost"
					className="flex-1 flex items-center justify-center text-xs text-text-muted cursor-pointer bg-bg-primary border-none font-family-ui w-full hover:bg-bg-secondary"
					onClick={() => {
						useWorkspaceStore.getState().activateTab(tab.id, paneId)
					}}
				>
					Tab suspended — click to resume
				</Button>
			) : content === null ? (
				<div className="flex-1 bg-bg-primary" />
			) : mode === "reading" ? (
				<ReadingView content={content} />
			) : mode === "side-by-side" ? (
				<SideBySideView
					content={content}
					filePath={tab.filePath}
					editorConfig={editorConfig}
					onChange={handleChange}
				/>
			) : (
				<EditorView
					content={content}
					filePath={tab.filePath}
					editorConfig={editorConfig}
					livePreview={mode === "live-preview"}
					onChange={handleChange}
					onCursorChange={isActive ? onCursorChange : undefined}
				/>
			)}
		</div>
	)
}

interface FileTagsStripProps {
	filePath: string
}

function FileTagsStrip({ filePath }: FileTagsStripProps) {
	const getTagsForFile = useTagsStore((s) => s.getTagsForFile)
	const getTagColor = useTagsStore((s) => s.getTagColor)
	const tags = getTagsForFile(filePath)

	if (tags.length === 0) return null

	return (
		<div className="flex items-center gap-1.5 px-3 py-1 border-b border-border/50 bg-bg-primary flex-wrap">
			<TagIcon className="size-3 text-muted-foreground flex-shrink-0" />
			{tags.map((tag) => {
				const color = getTagColor(tag)
				return (
					<span
						key={tag}
						className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-brand/10 text-brand border border-brand/20"
					>
						{color && (
							<span
								className="inline-block size-2 rounded-full flex-shrink-0"
								style={{ backgroundColor: color }}
							/>
						)}
						{tag}
					</span>
				)
			})}
		</div>
	)
}

interface Props {
	paneId: string
}

export function PaneView({ paneId }: Props) {
	const { panes, activePaneId, activateTab, closeTab, pinTab } = useWorkspaceStore()
	const { updateCursor, setActiveFile } = useEditorStore()
	const editorConfig = useEditorConfig()

	const rawPane = panes[paneId]
	const paneActiveTabId = rawPane?.activeTabId ?? null
	const pane: Pane | null = rawPane ? { ...rawPane, activeTabId: paneActiveTabId } : null

	const [fallbackMenu, setFallbackMenu] = useState<{
		tabId: string
		x: number
		y: number
	} | null>(null)

	useEffect(() => {
		if (paneId !== activePaneId || !pane?.activeTabId) return
		const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
		if (activeTab) setActiveFile(activeTab.filePath)
	}, [paneId, activePaneId, pane?.activeTabId, pane?.tabs, setActiveFile])

	const handleCloseOthers = useCallback(
		(tabId: string) => {
			if (!pane) return
			for (const tab of pane.tabs) {
				if (tab.id !== tabId && !tab.isPinned) {
					closeTab(tab.id, paneId)
				}
			}
		},
		[pane, closeTab, paneId],
	)

	const handleCloseToRight = useCallback(
		(tabId: string) => {
			if (!pane) return
			const tabIndex = pane.tabs.findIndex((t) => t.id === tabId)
			for (let i = pane.tabs.length - 1; i > tabIndex; i--) {
				const tab = pane.tabs[i]
				if (!tab.isPinned) closeTab(tab.id, paneId)
			}
		},
		[pane, closeTab, paneId],
	)

	const handleCopyPath = useCallback(
		(tabId: string) => {
			const tab = pane?.tabs.find((t) => t.id === tabId)
			if (tab) navigator.clipboard.writeText(tab.filePath)
		},
		[pane],
	)

	const handleReveal = useCallback(
		async (tabId: string) => {
			const tab = pane?.tabs.find((t) => t.id === tabId)
			if (tab) await getPlatform().dialog.revealFolder(tab.filePath)
		},
		[pane],
	)

	const handleTabContextMenu = useCallback(
		(tabId: string, event: React.MouseEvent) => {
			event.preventDefault()

			if (hasNativeMenu()) {
				const tab = pane?.tabs.find((t) => t.id === tabId)
				if (!tab) return

				const items: MenuItem[] = [
					{
						id: "close",
						text: "Close",
						accelerator: "CmdOrCtrl+W",
						action: () => closeTab(tabId, paneId),
					},
					{
						id: "close-others",
						text: "Close Others",
						action: () => handleCloseOthers(tabId),
					},
					{
						id: "close-right",
						text: "Close to the Right",
						action: () => handleCloseToRight(tabId),
					},
					{ type: "separator" },
					{
						id: "pin",
						text: tab.isPinned ? "Unpin" : "Pin",
						action: () => pinTab(tabId, paneId),
					},
					{ type: "separator" },
					{
						id: "copy-path",
						text: "Copy Path",
						action: () => handleCopyPath(tabId),
					},
					{
						id: "reveal",
						text: "Reveal in Finder",
						action: () => handleReveal(tabId),
					},
				]

				nativeMenu.showContextMenu({
					items,
					position: { x: event.clientX, y: event.clientY },
				})
			} else {
				setFallbackMenu({ tabId, x: event.clientX, y: event.clientY })
			}
		},
		[
			pane,
			closeTab,
			paneId,
			pinTab,
			handleCloseOthers,
			handleCloseToRight,
			handleCopyPath,
			handleReveal,
		],
	)

	if (!pane) return null

	const fallbackTab = fallbackMenu ? pane.tabs.find((t) => t.id === fallbackMenu.tabId) : null

	const handleActivate = (tabId: string) => {
		activateTab(tabId, paneId)
	}

	const handleClose = (tabId: string) => {
		closeTab(tabId, paneId)
	}

	const handlePin = (tabId: string) => {
		pinTab(tabId, paneId)
	}

	return (
		<div className="flex flex-col h-full overflow-hidden bg-bg-primary">
			<TabBar
				tabs={pane.tabs}
				activeTabId={pane.activeTabId}
				onActivate={handleActivate}
				onClose={handleClose}
				onPin={handlePin}
				onContextMenu={handleTabContextMenu}
			/>

			{pane.activeTabId &&
				(() => {
					const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
					return activeTab ? <FileTagsStrip filePath={activeTab.filePath} /> : null
				})()}

			{!hasNativeMenu() && fallbackTab && fallbackMenu && (
				<DropdownMenu
					open={true}
					onOpenChange={(open) => {
						if (!open) setFallbackMenu(null)
					}}
				>
					<DropdownMenuContent
						onCloseAutoFocus={(e) => e.preventDefault()}
						style={{
							position: "fixed",
							left: fallbackMenu.x,
							top: fallbackMenu.y,
						}}
					>
						<DropdownMenuItem onSelect={() => handleClose(fallbackTab.id)}>
							<XIcon />
							Close
							<DropdownMenuShortcut>⌘W</DropdownMenuShortcut>
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => handleCloseOthers(fallbackTab.id)}>
							Close Others
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => handleCloseToRight(fallbackTab.id)}>
							Close to the Right
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => handlePin(fallbackTab.id)}>
							{fallbackTab.isPinned ? <PinOffIcon /> : <PinIcon />}
							{fallbackTab.isPinned ? "Unpin" : "Pin"}
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onSelect={() => handleCopyPath(fallbackTab.id)}>
							<ClipboardCopyIcon />
							Copy Path
						</DropdownMenuItem>
						<DropdownMenuItem onSelect={() => handleReveal(fallbackTab.id)}>
							<FolderIcon />
							Reveal in Finder
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			<div className="flex-1 overflow-hidden relative">
				{pane.tabs.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-5 h-full text-sm text-text-muted">
						<p>No open files</p>
						<p className="flex gap-1 items-center">
							<Kbd>⌘</Kbd>
							<Kbd>n</Kbd>
							<span>New File</span>
						</p>
						<p className="flex gap-1 items-center">
							<Kbd>⌘</Kbd>
							<Kbd>o</Kbd>
							<span>Search notes</span>
						</p>
					</div>
				) : (
					pane.tabs.map((tab) => (
						<TabEditor
							key={tab.id}
							tab={tab}
							paneId={paneId}
							isActive={tab.id === pane.activeTabId}
							editorConfig={editorConfig}
							onCursorChange={(cursor) => {
								if (paneId === activePaneId) updateCursor(cursor)
							}}
						/>
					))
				)}
			</div>
		</div>
	)
}
