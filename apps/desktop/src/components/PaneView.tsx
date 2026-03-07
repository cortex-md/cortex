import type { Tab } from "@cortex/core"
import { noteCache, useEditorStore, useWorkspaceStore } from "@cortex/core"
import type { CursorInfo, EditorConfig } from "@cortex/editor"
import { EditorView } from "@cortex/editor"
import { useSettingsStore } from "@cortex/settings"
import { Button, TabBar } from "@cortex/ui"
import { useEffect, useMemo, useState } from "react"

function useEditorConfig(): EditorConfig {
	const { settings } = useSettingsStore()
	return useMemo(
		() => ({
			fontSize: settings.appearance.fontSize,
			lineHeight: settings.appearance.lineHeight,
			wordWrap: settings.editor.wordWrap,
			tabSize: settings.editor.tabSize,
			useSpaces: settings.editor.useSpaces,
			showLineNumbers: settings.editor.showLineNumbers,
		}),
		[
			settings.appearance.fontSize,
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

	useEffect(() => {
		noteCache.read(tab.filePath).then(setContent)
	}, [tab.filePath])

	return (
		<div
			className="tab-pane"
			style={{ display: isActive ? "flex" : "none" }}
			aria-hidden={!isActive}
		>
			{tab.isSuspended ? (
				<Button
					variant="ghost"
					className="editor-suspended"
					onClick={() => {
						useWorkspaceStore.getState().activateTab(tab.id, paneId)
					}}
				>
					Tab suspended — click to resume
				</Button>
			) : content === null ? (
				<div className="editor-loading" />
			) : (
				<EditorView
					content={content}
					filePath={tab.filePath}
					editorConfig={editorConfig}
					onChange={(c) => {
						noteCache.write(tab.filePath, c)
						markTabDirty(tab.id, true)
					}}
					onCursorChange={isActive ? onCursorChange : undefined}
				/>
			)}
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
	const pane = panes[paneId]

	useEffect(() => {
		if (paneId !== activePaneId || !pane?.activeTabId) return
		const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
		if (activeTab) setActiveFile(activeTab.filePath)
	}, [paneId, activePaneId, pane?.activeTabId, pane?.tabs, setActiveFile])

	if (!pane) return null

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
		<div className={`pane ${paneId === activePaneId ? "pane--active" : ""}`}>
			<TabBar
				tabs={pane.tabs}
				activeTabId={pane.activeTabId}
				onActivate={handleActivate}
				onClose={handleClose}
				onPin={handlePin}
			/>
			<div className="pane-content">
				{pane.tabs.length === 0 ? (
					<div className="pane-empty">
						<p>No open files</p>
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
