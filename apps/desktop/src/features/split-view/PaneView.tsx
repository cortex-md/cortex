import type { TransactionSpec } from "@codemirror/state"
import type { Pane, Tab } from "@cortex/core"
import {
	noteCache,
	useDragStore,
	useEditorStore,
	useRemoteVaultStore,
	useTagsStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import type { CursorInfo, EditorConfig } from "@cortex/editor"
import {
	clipboardImageExtension,
	EditorView,
	ReadingView,
	reconfigureMarkdownKeymap,
	SideBySideView,
} from "@cortex/editor"
import { useHotkeysStore } from "@cortex/hotkeys"
import { getPlatform } from "@cortex/platform"
import { PluginViewRenderer, setEditorViewRef, usePluginStore } from "@cortex/plugin-runtime"
import {
	extractFrontmatterBody,
	type PropertyMap,
	parseFrontmatter,
	replaceFrontmatterBody,
} from "@cortex/properties"
import {
	createFrontmatterExtension,
	updateFrontmatterEditorState,
} from "@cortex/properties/codemirror"
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
import { convertFileSrc } from "@tauri-apps/api/core"
import {
	ClipboardCopyIcon,
	Columns2Icon,
	FolderIcon,
	HistoryIcon,
	PinIcon,
	PinOffIcon,
	TagIcon,
	XIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { MenuItem } from "@/utils/context-menu"
import { NativeMenuActions } from "@/utils/context-menu"
import { NotePropertiesPanel } from "../properties/NotePropertiesPanel"
import { ConflictBanner } from "../sync/ConflictBanner"
import { NoteHistoryPanel } from "../sync/NoteHistoryPanel"
import { TabBar } from "../tabs/TabBar"
import { getCoreViewComponent } from "./coreViewRegistry"
import { DropZoneOverlay } from "./DropZoneOverlay"
import { EditorContextMenu } from "./EditorContextMenu"
import { NoteHeader } from "./NoteHeader"

function computeRelativePath(fromDir: string, toFile: string): string {
	const fromParts = fromDir.split("/").filter(Boolean)
	const toParts = toFile.split("/").filter(Boolean)
	let common = 0
	while (
		common < fromParts.length &&
		common < toParts.length &&
		fromParts[common] === toParts[common]
	) {
		common++
	}
	const ups = fromParts.length - common
	const remaining = toParts.slice(common)
	const relative = [...Array(ups).fill(".."), ...remaining].join("/")
	return relative.startsWith(".") ? relative : `./${relative}`
}

function extensionFromMimeType(mimeType: string): string {
	if (mimeType === "image/jpeg") return ".jpg"
	if (mimeType === "image/webp") return ".webp"
	if (mimeType === "image/gif") return ".gif"
	return ".png"
}

const hasNativeMenu = () => getPlatform().capabilities.includes("menu")
const nativeMenu = new NativeMenuActions()

function useEditorConfig(): EditorConfig {
	const { settings } = useSettingsStore()
	return useMemo(
		() => ({
			fontSize: settings.appearance.editorFontSize,
			wordWrap: settings.editor.wordWrap,
			tabSize: settings.editor.tabSize,
			useSpaces: settings.editor.useSpaces,
			showLineNumbers: settings.editor.showLineNumbers,
			vimMode: settings.editor.vimMode,
		}),
		[
			settings.appearance.editorFontSize,
			settings.editor.wordWrap,
			settings.editor.tabSize,
			settings.editor.useSpaces,
			settings.editor.showLineNumbers,
			settings.editor.vimMode,
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

interface CMView {
	state: { doc: { toString(): string; length: number } }
	dispatch(spec: TransactionSpec): void
}

function TabEditor({ tab, paneId, isActive, editorConfig, onCursorChange }: TabEditorProps) {
	const [rawContent, setRawContent] = useState<string | null>(null)
	const { markTabDirty } = useWorkspaceStore()
	const mode = useEditorStore((s) => s.mode)
	const viewRef = useRef<CMView | null>(null)
	const rawContentRef = useRef<string | null>(null)
	const frontmatterStateRef = useRef<{ meta: PropertyMap; error: string | null }>({
		meta: {},
		error: null,
	})
	const getEditorView = useCallback(
		() => viewRef.current as import("@codemirror/view").EditorView | null,
		[],
	)

	const formatBindingsSnapshot = useHotkeysStore((s) =>
		s.bindings
			.filter((b) => b.category === "Format")
			.map((b) => `${b.id}=${b.keys}:${b.enabled}`)
			.join(","),
	)

	const handleImagePaste = useCallback(
		async (imageBlob: Blob): Promise<string | null> => {
			const vaultPath = useVaultStore.getState().vault?.path
			if (!vaultPath) return null

			const editorSettings = useSettingsStore.getState().settings.editor
			const fileDir = tab.filePath.substring(0, tab.filePath.lastIndexOf("/"))

			let targetDir: string
			if (editorSettings.imageStorageLocation === "root") {
				targetDir = vaultPath
			} else if (editorSettings.imageStorageLocation === "custom") {
				const customPath = editorSettings.imageStorageCustomPath
				targetDir = customPath ? `${vaultPath}/${customPath}` : vaultPath
			} else {
				targetDir = fileDir
			}

			const extension = extensionFromMimeType(imageBlob.type)
			const fileName = `paste-${Date.now()}${extension}`
			const targetPath = `${targetDir}/${fileName}`

			const arrayBuffer = await imageBlob.arrayBuffer()
			const data = Array.from(new Uint8Array(arrayBuffer))

			await getPlatform().fs.writeBinaryFile(targetPath, data)

			const relativePath = computeRelativePath(fileDir, targetPath)
			return `![${fileName}](${relativePath})`
		},
		[tab.filePath],
	)

	const editorExtensions = useMemo(
		() => [clipboardImageExtension(handleImagePaste), createFrontmatterExtension()],
		[handleImagePaste],
	)

	const resolveImageUrl = useCallback((src: string, currentFilePath: string): string => {
		if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) {
			return src
		}
		const fileDir = currentFilePath.substring(0, currentFilePath.lastIndexOf("/"))
		const absolutePath = src.startsWith("/") ? src : `${fileDir}/${src}`
		return convertFileSrc(absolutePath)
	}, [])

	const updateProjectedFrontmatter = useCallback((content: string) => {
		try {
			const { meta } = parseFrontmatter(content)
			frontmatterStateRef.current = { meta, error: null }
		} catch (error) {
			frontmatterStateRef.current = {
				meta: {},
				error: error instanceof Error ? error.message : String(error),
			}
		}
		const view = viewRef.current as import("@codemirror/view").EditorView | null
		if (view) {
			updateFrontmatterEditorState(
				view,
				frontmatterStateRef.current.meta,
				frontmatterStateRef.current.error,
			)
		}
	}, [])

	useEffect(() => {
		rawContentRef.current = null
		setRawContent(null)
		noteCache.read(tab.filePath).then((content) => {
			rawContentRef.current = content
			setRawContent(content)
			updateProjectedFrontmatter(content)
		})
	}, [tab.filePath, updateProjectedFrontmatter])

	useEffect(() => {
		const unsubscribe = noteCache.onContentChange(tab.filePath, (_filePath, newContent) => {
			rawContentRef.current = newContent
			setRawContent(newContent)
			updateProjectedFrontmatter(newContent)
		})
		return unsubscribe
	}, [tab.filePath, updateProjectedFrontmatter])

	const handleChange = useCallback(
		(newBody: string) => {
			const currentRawContent = rawContentRef.current ?? ""
			const nextRawContent = replaceFrontmatterBody(currentRawContent, newBody)
			rawContentRef.current = nextRawContent
			setRawContent(nextRawContent)
			noteCache.write(tab.filePath, nextRawContent)
			markTabDirty(tab.id, true)
		},
		[tab.filePath, tab.id, markTabDirty],
	)

	const handleExternalLinkClick = useCallback((url: string) => {
		void getPlatform().app.openExternalUrl(url)
	}, [])

	const handleViewReady = useCallback(
		(view: CMView) => {
			viewRef.current = view
			updateFrontmatterEditorState(
				view as import("@codemirror/view").EditorView,
				frontmatterStateRef.current.meta,
				frontmatterStateRef.current.error,
			)
			if (isActive) setEditorViewRef(view as never)
		},
		[isActive],
	)

	// biome-ignore lint/correctness/useExhaustiveDependencies: formatBindingsSnapshot is an intentional change-signal; bindings are read fresh from store
	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		const formatBindings = useHotkeysStore
			.getState()
			.bindings.filter((b) => b.category === "Format")
		reconfigureMarkdownKeymap(view as import("@codemirror/view").EditorView, formatBindings)
	}, [formatBindingsSnapshot])

	useEffect(() => {
		if (isActive && viewRef.current) {
			setEditorViewRef(viewRef.current as never)
		}
	}, [isActive])

	return (
		<EditorContextMenu getEditorView={getEditorView}>
			<div
				className="absolute inset-0 flex flex-col"
				style={{ display: isActive ? "flex" : "none" }}
				aria-hidden={!isActive}
			>
				{tab.isSuspended ? (
					<Button
						variant="ghost"
						className="flex-1 flex items-center justify-center text-xs text-text-muted bg-bg-primary border-none font-family-ui w-full hover:bg-bg-secondary"
						onClick={() => {
							useWorkspaceStore.getState().activateTab(tab.id, paneId)
						}}
					>
						Tab suspended — click to resume
					</Button>
				) : rawContent === null ? (
					<div className="flex-1 bg-bg-primary" />
				) : (
					<div className="note-document-scroll">
						<NoteHeader filePath={tab.filePath} />
						<NotePropertiesPanel filePath={tab.filePath} />
						<div className="note-document-surface">
							{mode === "reading" ? (
								<ReadingView
									content={extractFrontmatterBody(rawContent)}
									scrollMode="parent"
									onExternalLinkClick={handleExternalLinkClick}
								/>
							) : mode === "side-by-side" ? (
								<SideBySideView
									content={extractFrontmatterBody(rawContent)}
									filePath={tab.filePath}
									editorConfig={editorConfig}
									extraExtensions={editorExtensions}
									scrollMode="parent"
									onChange={handleChange}
									onViewReady={handleViewReady}
									onExternalLinkClick={handleExternalLinkClick}
								/>
							) : (
								<EditorView
									content={extractFrontmatterBody(rawContent)}
									filePath={tab.filePath}
									editorConfig={editorConfig}
									livePreview={mode === "live-preview"}
									resolveImageUrl={resolveImageUrl}
									extraExtensions={editorExtensions}
									scrollMode="parent"
									onChange={handleChange}
									onCursorChange={isActive ? onCursorChange : undefined}
									onViewReady={handleViewReady}
								/>
							)}
						</div>
					</div>
				)}
			</div>
		</EditorContextMenu>
	)
}

interface ViewTabContentProps {
	tab: Tab
	paneId: string
	isActive: boolean
}

function ViewTabContent({ tab, paneId, isActive }: ViewTabContentProps) {
	const views = usePluginStore((s) => s.views)
	const updateViewTabState = useWorkspaceStore((s) => s.updateViewTabState)
	const CoreComponent = tab.viewId ? getCoreViewComponent(tab.viewId) : null
	const pluginRegistration = views.find((v) => v.id === tab.viewId)
	const viewState = tab.viewState ?? pluginRegistration?.initialState ?? {}

	return (
		<div
			className="absolute inset-0 flex flex-col overflow-auto"
			style={{ display: isActive ? "flex" : "none" }}
			aria-hidden={!isActive}
		>
			{CoreComponent ? (
				<CoreComponent />
			) : pluginRegistration ? (
				<div className="p-4">
					<PluginViewRenderer
						registration={pluginRegistration}
						state={viewState}
						onStateChange={(nextState) => updateViewTabState(tab.id, paneId, nextState)}
					/>
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-text-muted">
					View not available
					<Button
						variant="ghost"
						size="sm"
						onClick={() => useWorkspaceStore.getState().closeTab(tab.id, paneId)}
					>
						Close tab
					</Button>
				</div>
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
	const dragSource = useDragStore((s) => s.dragSource)
	const editorConfig = useEditorConfig()

	const rawPane = panes[paneId]
	const paneActiveTabId = rawPane?.activeTabId ?? null
	const pane: Pane | null = rawPane ? { ...rawPane, activeTabId: paneActiveTabId } : null

	const linkedVaultId = useRemoteVaultStore((s) => s.linkedVaultId)
	const [fallbackMenu, setFallbackMenu] = useState<{
		tabId: string
		x: number
		y: number
	} | null>(null)
	const [historyFilePath, setHistoryFilePath] = useState<string | null>(null)

	useEffect(() => {
		if (paneId !== activePaneId || !pane?.activeTabId) return
		const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
		if (activeTab?.tabType === "file") setActiveFile(activeTab.filePath)
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

	const handleOpenInRight = useCallback(
		(tabId: string) => {
			const tab = pane?.tabs.find((t) => t.id === tabId)
			if (tab?.filePath) {
				useWorkspaceStore.getState().openInSplit(tab.filePath, paneId, "horizontal")
			}
		},
		[pane, paneId],
	)

	const handleViewHistory = useCallback(
		(tabId: string) => {
			const tab = pane?.tabs.find((t) => t.id === tabId)
			if (tab) setHistoryFilePath(tab.filePath)
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
					...(tab.tabType === "file"
						? [
								{ type: "separator" } as MenuItem,
								{
									id: "open-right-split",
									text: "Open in Right Split",
									action: () => handleOpenInRight(tabId),
								} as MenuItem,
								{ type: "separator" } as MenuItem,
								{
									id: "copy-path",
									text: "Copy Path",
									action: () => handleCopyPath(tabId),
								} as MenuItem,
								{
									id: "reveal",
									text: "Reveal in Finder",
									action: () => handleReveal(tabId),
								} as MenuItem,
								...(linkedVaultId
									? [
											{ type: "separator" } as MenuItem,
											{
												id: "version-history",
												text: "Version History",
												action: () => handleViewHistory(tabId),
											} as MenuItem,
										]
									: []),
							]
						: []),
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
			linkedVaultId,
			handleCloseOthers,
			handleCloseToRight,
			handleOpenInRight,
			handleCopyPath,
			handleReveal,
			handleViewHistory,
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
		<div className="relative flex flex-col h-full overflow-hidden bg-bg-primary">
			<TabBar
				tabs={pane.tabs}
				activeTabId={pane.activeTabId}
				paneId={paneId}
				onActivate={handleActivate}
				onClose={handleClose}
				onPin={handlePin}
				onContextMenu={handleTabContextMenu}
			/>

			{pane.activeTabId &&
				(() => {
					const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
					return activeTab?.tabType === "file" ? (
						<FileTagsStrip filePath={activeTab.filePath} />
					) : null
				})()}

			{pane.activeTabId &&
				(() => {
					const activeTab = pane.tabs.find((t) => t.id === pane.activeTabId)
					return activeTab?.tabType === "file" ? (
						<ConflictBanner filePath={activeTab.filePath} />
					) : null
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
						{fallbackTab.tabType === "file" && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem onSelect={() => handleOpenInRight(fallbackTab.id)}>
									<Columns2Icon />
									Open in Right Split
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
								{linkedVaultId && (
									<>
										<DropdownMenuSeparator />
										<DropdownMenuItem onSelect={() => handleViewHistory(fallbackTab.id)}>
											<HistoryIcon />
											Version History
										</DropdownMenuItem>
									</>
								)}
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			<div className="flex-1 overflow-hidden relative" data-drop-pane-id={paneId}>
				{dragSource && <DropZoneOverlay paneId={paneId} />}
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
					pane.tabs.map((tab) =>
						tab.tabType === "view" ? (
							<ViewTabContent
								key={tab.id}
								tab={tab}
								paneId={paneId}
								isActive={tab.id === pane.activeTabId}
							/>
						) : (
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
						),
					)
				)}
			</div>

			<NoteHistoryPanel
				filePath={historyFilePath ?? ""}
				open={historyFilePath !== null}
				onOpenChange={(open) => {
					if (!open) setHistoryFilePath(null)
				}}
			/>
		</div>
	)
}
