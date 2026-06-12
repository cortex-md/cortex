import {
	isSyncImagePath,
	shouldIgnoreSyncPath,
	useSyncStore,
	useTagsStore,
	useVaultStore,
	useWorkspaceStore,
} from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import {
	Button,
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
	Input,
} from "@cortex/ui"
import { type Rect, useVirtualizer, type Virtualizer } from "@tanstack/react-virtual"
import {
	ChevronRightIcon,
	ClipboardCopyIcon,
	CloudOffIcon,
	CopyIcon,
	ExternalLinkIcon,
	FilePlusIcon,
	FolderIcon,
	FolderPlusIcon,
	HistoryIcon,
	PencilIcon,
	TrashIcon,
} from "lucide-react"
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { NativeMenuActions } from "@/utils/context-menu"
import { reportAppError } from "@/utils/reportAppError"
import { useInternalDragSource } from "../split-view/useInternalDragSource"
import { NoteHistoryPanel } from "../sync/NoteHistoryPanel"
import {
	buildFileTree,
	type FileTreeNode,
	type FileTreeRow,
	flattenVisibleFileTree,
} from "./fileTree"
import { buildFileContextMenuItems, buildRootContextMenuItems } from "./NativeMenuActions"

const emptyTags: string[] = []

function observeTreeElementRect(
	instance: Virtualizer<HTMLDivElement, Element>,
	callback: (rect: Rect) => void,
): () => void {
	const element = instance.scrollElement
	const update = () => {
		callback({
			width: element?.clientWidth || 320,
			height: element?.clientHeight || 600,
		})
	}
	update()
	if (!element || typeof ResizeObserver === "undefined") return () => undefined
	const observer = new ResizeObserver(update)
	observer.observe(element)
	return () => observer.disconnect()
}

interface InlineInputProps {
	defaultValue: string
	onConfirm: (value: string) => void
	onCancel: () => void
	selectBaseName?: boolean
}

function InlineInput({ defaultValue, onConfirm, onCancel, selectBaseName }: InlineInputProps) {
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		const input = inputRef.current
		if (!input) return
		input.focus()
		if (selectBaseName) {
			const dotIndex = defaultValue.lastIndexOf(".")
			input.setSelectionRange(0, dotIndex > 0 ? dotIndex : defaultValue.length)
		} else {
			input.select()
		}
	}, [defaultValue, selectBaseName])

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault()
			const value = inputRef.current?.value.trim()
			if (value) onConfirm(value)
			else onCancel()
		}
		if (e.key === "Escape") {
			e.preventDefault()
			onCancel()
		}
	}

	return (
		<Input
			ref={inputRef}
			type="text"
			defaultValue={defaultValue}
			onKeyDown={handleKeyDown}
			onBlur={() => {
				const value = inputRef.current?.value.trim()
				if (value && value !== defaultValue) onConfirm(value)
				else onCancel()
			}}
			className="w-full h-[24px] px-1.5 text-xs bg-bg-primary border border-border-focus rounded-sm outline-none text-text-primary"
		/>
	)
}

const hasNativeMenu = () => getPlatform().capabilities.includes("menu")

const nativeMenu = new NativeMenuActions()

interface FileActions {
	onOpenFile: (path: string) => void
	onNewFile: (parentPath: string) => void
	onNewFolder: (parentPath: string) => void
	onStartRename: (path: string) => void
	onDelete: (path: string, isDir: boolean) => void
	onDuplicate: (path: string) => void
	onReveal: (path: string) => void
	onCopyPath: (path: string, kind: "relative" | "absolute") => void
	onViewHistory: (path: string) => void
}

function showNativeFileContextMenu(
	node: FileTreeNode,
	position: { x: number; y: number },
	actions: FileActions,
) {
	const vault = useVaultStore.getState().vault
	const vaultPath = vault?.path
	const syncPreferences = useSyncStore.getState().syncPreferences
	const relative = vaultPath ? node.path.replace(`${vaultPath}/`, "") : ""
	const syncIgnoreToggleAvailable = !(
		syncPreferences.ignoreImages &&
		!node.isDir &&
		isSyncImagePath(relative)
	)
	const items = buildFileContextMenuItems(
		{
			path: node.path,
			fileName: node.name,
			isDirectory: node.isDir,
			selectionCount: 1,
			isMultiSelect: false,
		},
		{
			createFile: (parentPath) => actions.onNewFile(parentPath ?? node.path),
			createFolder: (parentPath) => actions.onNewFolder(parentPath ?? node.path),
			openInNewTab: (path) => actions.onOpenFile(path),
			openInRightSplit: (path) => {
				const { activePaneId } = useWorkspaceStore.getState()
				if (activePaneId) {
					useWorkspaceStore.getState().openInSplit(path, activePaneId, "horizontal")
				}
			},
			rename: (path) => actions.onStartRename(path),
			addBookmark: () => {},
			delete: (path, isDir) => actions.onDelete(path, isDir),
			copyFile: (path) => actions.onDuplicate(path),
			copyPath: (path) => actions.onCopyPath(path, "absolute"),
			copyRelativePath: (path) => actions.onCopyPath(path, "relative"),
			showInExplorer: (path) => actions.onReveal(path),
			showVersionHistory: (path) => actions.onViewHistory(path),
			toggleSyncIgnore:
				vaultPath && syncIgnoreToggleAvailable
					? (path, ignored) => {
							const relative = path.replace(`${vaultPath}/`, "")
							const normalized = node.isDir
								? relative.endsWith("/")
									? relative
									: `${relative}/`
								: relative
							useSyncStore.getState().toggleExcludedPath(normalized, ignored)
						}
					: undefined,
			isSyncIgnored:
				vaultPath && syncIgnoreToggleAvailable
					? (path) => {
							const relative = path.replace(`${vaultPath}/`, "")
							return useSyncStore.getState().isPathExcluded(relative)
						}
					: undefined,
		},
	)

	nativeMenu.showContextMenu({ items, position })
}

interface TreeNodeRowProps {
	node: FileTreeNode
	depth: number
	isActive: boolean
	isExpanded: boolean
	isRenaming: boolean
	tagColors: Array<{ tag: string; color: string | null }>
	onToggle: (path: string) => void
	onOpenFile: (path: string) => void
	onStartRename: (path: string) => void
	onConfirmRename: (oldPath: string, newName: string) => void
	onCancelRename: () => void
}

function TreeNodeRow({
	node,
	depth,
	isActive,
	isExpanded,
	isRenaming,
	tagColors,
	onToggle,
	onOpenFile,
	onStartRename,
	onConfirmRename,
	onCancelRename,
}: TreeNodeRowProps) {
	const canDragFile = !node.isDir && !isRenaming
	const dragProps = useInternalDragSource(
		() => ({
			type: "file",
			filePath: node.path,
		}),
		{ disabled: !canDragFile },
	)

	return (
		<Button
			variant={"ghost"}
			role="treeitem"
			aria-level={depth + 1}
			aria-expanded={node.isDir ? isExpanded : undefined}
			tabIndex={0}
			size={"sm"}
			className={`file-tree-item flex items-center text-left gap-1 px-1.5 w-full rounded-sm text-text-secondary text-xs hover:bg-bg-hover hover:text-text-primary select-none outline-none focus-visible:ring-1 focus-visible:ring-border-focus ${
				isActive ? "active bg-accent text-primary" : ""
			}`}
			style={{ paddingLeft: `${depth * 12 + 6}px` }}
			{...dragProps}
			onClick={() => {
				if (isRenaming) return
				if (node.isDir) onToggle(node.path)
				else onOpenFile(node.path)
			}}
			onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
				if (e.key === "Enter") {
					if (node.isDir) onToggle(node.path)
					else onOpenFile(node.path)
				}
				if (e.key === "F2") onStartRename(node.path)
			}}
		>
			{node.isDir && (
				<ChevronRightIcon
					size={12}
					strokeWidth={2.5}
					className={`text-text-muted flex-shrink-0 transition-transform duration-100 ${
						isExpanded ? "rotate-90" : ""
					}`}
				/>
			)}
			{isRenaming ? (
				<InlineInput
					defaultValue={node.name}
					onConfirm={(newName) => onConfirmRename(node.path, newName)}
					onCancel={onCancelRename}
					selectBaseName={!node.isDir}
				/>
			) : (
				<span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1">
					{node.isDir ? node.name : node.name.replace(/\.md$/, "")}
				</span>
			)}
			{!node.isDir && tagColors.length > 0 && (
				<span className="flex items-center gap-0.5 flex-shrink-0">
					{tagColors.map((tc) => (
						<span
							key={tc.tag}
							className="inline-block size-2 rounded-full"
							style={{ backgroundColor: tc.color ?? "var(--brand)" }}
							title={tc.tag}
						/>
					))}
				</span>
			)}
		</Button>
	)
}

const MemoizedTreeNodeRow = memo(TreeNodeRow)

interface TreeNodeProps {
	node: FileTreeNode
	depth: number
	isActive: boolean
	isExpanded: boolean
	isRenaming: boolean
	onOpenFile: (path: string) => void
	onToggle: (path: string) => void
	onStartRename: (path: string) => void
	onConfirmRename: (oldPath: string, newName: string) => void
	onCancelRename: () => void
	onDelete: (path: string, isDir: boolean) => void
	onDuplicate: (path: string) => void
	onReveal: (path: string) => void
	onCopyPath: (path: string, kind: "relative" | "absolute") => void
	onNewFile: (parentPath: string) => void
	onNewFolder: (parentPath: string) => void
	onViewHistory: (path: string) => void
}

function TreeNodeView({
	node,
	depth,
	isActive,
	isExpanded,
	isRenaming,
	onOpenFile,
	onToggle,
	onStartRename,
	onConfirmRename,
	onCancelRename,
	onDelete,
	onDuplicate,
	onReveal,
	onCopyPath,
	onNewFile,
	onNewFolder,
	onViewHistory,
}: TreeNodeProps) {
	const fileTags = useTagsStore((state) => state.fileTags[node.path] ?? emptyTags)
	const tagColorsByName = useTagsStore((state) => state.tagColors)
	const tagColors = useMemo(
		() => fileTags.map((tag) => ({ tag, color: tagColorsByName[tag] ?? null })),
		[fileTags, tagColorsByName],
	)

	const rowProps = {
		node,
		depth,
		isActive,
		isExpanded,
		isRenaming,
		tagColors,
		onToggle,
		onOpenFile,
		onStartRename,
		onConfirmRename,
		onCancelRename,
	}

	const fileActions: FileActions = {
		onOpenFile,
		onNewFile,
		onNewFolder,
		onStartRename,
		onDelete,
		onDuplicate,
		onReveal,
		onCopyPath,
		onViewHistory,
	}

	return (
		<>
			{hasNativeMenu() ? (
				// biome-ignore lint/a11y/noStaticElementInteractions: wrapper for native context menu
				<div
					onContextMenu={(e) => {
						e.preventDefault()
						showNativeFileContextMenu(node, { x: e.clientX, y: e.clientY }, fileActions)
					}}
				>
					<MemoizedTreeNodeRow {...rowProps} />
				</div>
			) : (
				<ContextMenu>
					<ContextMenuTrigger asChild>
						<MemoizedTreeNodeRow {...rowProps} />
					</ContextMenuTrigger>
					<ContextMenuContent>
						{!node.isDir && (
							<>
								<ContextMenuItem onSelect={() => onOpenFile(node.path)}>
									<ExternalLinkIcon />
									Open in new tab
								</ContextMenuItem>
								<ContextMenuItem
									onSelect={() => {
										const ws = useWorkspaceStore.getState()
										if (ws.activePaneId) {
											ws.openInSplit(node.path, ws.activePaneId, "horizontal")
										}
									}}
								>
									Open in Right Split
								</ContextMenuItem>
								<ContextMenuSeparator />
							</>
						)}
						{node.isDir && (
							<>
								<ContextMenuItem onSelect={() => onNewFile(node.path)}>
									<FilePlusIcon />
									New Note
								</ContextMenuItem>
								<ContextMenuItem onSelect={() => onNewFolder(node.path)}>
									<FolderPlusIcon />
									New Folder
								</ContextMenuItem>
								<ContextMenuSeparator />
							</>
						)}
						{!node.isDir && (
							<ContextMenuItem onSelect={() => onDuplicate(node.path)}>
								<CopyIcon />
								Duplicate
							</ContextMenuItem>
						)}
						<ContextMenuSub>
							<ContextMenuSubTrigger>
								<ClipboardCopyIcon />
								Copy path
							</ContextMenuSubTrigger>
							<ContextMenuSubContent>
								<ContextMenuItem onSelect={() => onCopyPath(node.path, "relative")}>
									Relative path
								</ContextMenuItem>
								<ContextMenuItem onSelect={() => onCopyPath(node.path, "absolute")}>
									Absolute path
								</ContextMenuItem>
							</ContextMenuSubContent>
						</ContextMenuSub>
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => onReveal(node.path)}>
							<FolderIcon />
							Reveal in Finder
						</ContextMenuItem>
						{!node.isDir && (
							<>
								<ContextMenuSeparator />
								<ContextMenuItem onSelect={() => onViewHistory(node.path)}>
									<HistoryIcon />
									View History
								</ContextMenuItem>
							</>
						)}
						<ContextMenuSeparator />
						<ContextMenuItem onSelect={() => onStartRename(node.path)}>
							<PencilIcon />
							Rename
							<ContextMenuShortcut>F2</ContextMenuShortcut>
						</ContextMenuItem>
						<ContextMenuItem variant="destructive" onSelect={() => onDelete(node.path, node.isDir)}>
							<TrashIcon />
							Delete
						</ContextMenuItem>
						<SyncExcludeMenuItem node={node} />
					</ContextMenuContent>
				</ContextMenu>
			)}
		</>
	)
}

const MemoizedTreeNodeView = memo(TreeNodeView)

function SyncExcludeMenuItem({ node }: { node: FileTreeNode }) {
	const vaultPath = useVaultStore((s) => s.vault?.path)
	const syncPreferences = useSyncStore((s) => s.syncPreferences)

	if (!vaultPath) return null

	const relative = node.path.replace(`${vaultPath}/`, "")
	if (syncPreferences.ignoreImages && !node.isDir && isSyncImagePath(relative)) return null

	const normalized = node.isDir ? (relative.endsWith("/") ? relative : `${relative}/`) : relative
	const isExcluded = shouldIgnoreSyncPath(relative, syncPreferences)

	return (
		<>
			<ContextMenuSeparator />
			<ContextMenuItem
				onSelect={() => useSyncStore.getState().toggleExcludedPath(normalized, !isExcluded)}
			>
				<CloudOffIcon />
				{isExcluded ? "Include in Sync" : "Exclude from Sync"}
			</ContextMenuItem>
		</>
	)
}

export function FileSidebar() {
	const { vault, files, createFile, createFolder, deleteFile, renameFile, duplicateFile } =
		useVaultStore()
	const { openTab, closeTabsByPath, updateTabPath, activePaneId, panes } = useWorkspaceStore()
	const [expanded, setExpanded] = useState<Set<string>>(new Set())
	const [renamingPath, setRenamingPath] = useState<string | null>(null)
	const [creatingIn, setCreatingIn] = useState<string | null>(null)
	const [creatingType, setCreatingType] = useState<"file" | "folder" | null>(null)
	const [historyFilePath, setHistoryFilePath] = useState<string | null>(null)

	const activePane = panes[activePaneId]
	const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId)

	const handleToggle = useCallback((path: string) => {
		setExpanded((prev) => {
			const next = new Set(prev)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			return next
		})
	}, [])

	const ensureExpanded = useCallback((path: string) => {
		setExpanded((prev) => {
			if (prev.has(path)) return prev
			const next = new Set(prev)
			next.add(path)
			return next
		})
	}, [])

	const handleNewFile = useCallback(
		(parentPath: string) => {
			ensureExpanded(parentPath)
			setCreatingIn(parentPath)
			setCreatingType("file")
		},
		[ensureExpanded],
	)

	const handleNewFolder = useCallback(
		(parentPath: string) => {
			ensureExpanded(parentPath)
			setCreatingIn(parentPath)
			setCreatingType("folder")
		},
		[ensureExpanded],
	)

	const handleConfirmCreate = useCallback(
		async (parentPath: string, name: string) => {
			try {
				if (creatingType === "folder") {
					await createFolder(parentPath, name)
				} else {
					const filePath = await createFile(parentPath, name)
					openTab(filePath)
				}
			} catch (error) {
				await reportAppError({
					operation: "create-file-entry",
					source: "file-explorer",
					cause: error,
					userMessage: "The file or folder could not be created.",
					context: { parentPath, name },
				})
			}
			setCreatingIn(null)
			setCreatingType(null)
		},
		[creatingType, createFile, createFolder, openTab],
	)

	const handleCancelCreate = useCallback(() => {
		setCreatingIn(null)
		setCreatingType(null)
	}, [])
	const handleCancelRename = useCallback(() => setRenamingPath(null), [])

	const handleConfirmRename = useCallback(
		async (oldPath: string, newName: string) => {
			try {
				const newPath = await renameFile(oldPath, newName)
				updateTabPath(oldPath, newPath)
			} catch (error) {
				await reportAppError({
					operation: "rename-file-entry",
					source: "file-explorer",
					cause: error,
					userMessage: "The file or folder could not be renamed.",
					context: { oldPath, newName },
				})
			}
			setRenamingPath(null)
		},
		[renameFile, updateTabPath],
	)

	const handleDelete = useCallback(
		async (filePath: string, _isDir: boolean) => {
			const platform = getPlatform()
			const name = filePath.split("/").pop() ?? filePath
			const confirmed = await platform.dialog.showConfirm(
				"Delete",
				`Are you sure you want to delete "${name}"?`,
			)
			if (!confirmed) return
			closeTabsByPath(filePath)
			try {
				await deleteFile(filePath)
			} catch (error) {
				await reportAppError({
					operation: "delete-file-entry",
					source: "file-explorer",
					cause: error,
					userMessage: `"${name}" could not be deleted.`,
					context: { filePath },
				})
			}
		},
		[deleteFile, closeTabsByPath],
	)

	const handleDuplicate = useCallback(
		async (filePath: string) => {
			try {
				const newPath = await duplicateFile(filePath)
				openTab(newPath)
			} catch (error) {
				await reportAppError({
					operation: "duplicate-file",
					source: "file-explorer",
					cause: error,
					userMessage: "The note could not be duplicated.",
					context: { filePath },
				})
			}
		},
		[duplicateFile, openTab],
	)

	const handleReveal = useCallback(async (filePath: string) => {
		const platform = getPlatform()
		await platform.dialog.revealFolder(filePath)
	}, [])

	const handleCopyPath = useCallback(
		(filePath: string, kind: "relative" | "absolute") => {
			if (kind === "relative" && vault) {
				const relative = filePath.replace(`${vault.path}/`, "")
				navigator.clipboard.writeText(relative)
			} else {
				navigator.clipboard.writeText(filePath)
			}
		},
		[vault],
	)

	const vaultPath = vault?.path ?? ""
	const tree = useMemo(() => buildFileTree(files, vaultPath), [files, vaultPath])
	const rows = useMemo<FileTreeRow[]>(() => {
		if (!vault) return []
		const visibleRows = flattenVisibleFileTree(tree, expanded, creatingIn, creatingType)
		if (creatingIn !== vault.path || !creatingType) return visibleRows
		return [
			{
				kind: "create",
				parentPath: vault.path,
				depth: 0,
				createType: creatingType,
			},
			...visibleRows,
		]
	}, [creatingIn, creatingType, expanded, tree, vault])
	const treeScrollRef = useRef<HTMLDivElement>(null)
	const rowVirtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => treeScrollRef.current,
		estimateSize: () => 26,
		overscan: 8,
		initialRect: { width: 320, height: 600 },
		observeElementRect: observeTreeElementRect,
		getItemKey: (index) => {
			const row = rows[index]
			return row?.kind === "node"
				? row.node.path
				: `${row?.parentPath ?? "root"}:${row?.createType ?? "create"}`
		},
	})

	if (!vault) {
		return
	}

	const isCreatingAtRoot = creatingIn === vault.path

	const handleRootContextMenu = (e: React.MouseEvent) => {
		if (!hasNativeMenu()) return
		e.preventDefault()
		const items = buildRootContextMenuItems(vault.path, {
			createFile: (parentPath) => handleNewFile(parentPath ?? vault.path),
			createFolder: (parentPath) => handleNewFolder(parentPath ?? vault.path),
		})
		nativeMenu.showContextMenu({ items, position: { x: e.clientX, y: e.clientY } })
	}

	return (
		<div className="file-sidebar flex flex-col h-full px-1.5 overflow-hidden">
			<div className="file-sidebar-header flex items-center justify-between px-2 py-1.5 flex-shrink-0">
				<span className="text-[10px] font-bold text-text-muted uppercase tracking-wide">Files</span>
				<div className="flex items-center gap-0.5">
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={() => handleNewFile(vault.path)}
						className="sidebar-action-button text-text-muted hover:text-text-primary hover:bg-bg-hover"
						title="New Note"
						aria-label="New Note"
					>
						<FilePlusIcon size={14} />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={() => handleNewFolder(vault.path)}
						className="sidebar-action-button text-text-muted hover:text-text-primary hover:bg-bg-hover"
						title="New Folder"
						aria-label="New Folder"
					>
						<FolderPlusIcon size={14} />
					</Button>
				</div>
			</div>
			<div
				ref={treeScrollRef}
				className="flex-1 overflow-y-auto px-1 pb-1"
				role="tree"
				onContextMenu={handleRootContextMenu}
			>
				{tree.length === 0 && !isCreatingAtRoot ? (
					<div className="flex items-center justify-center p-8 text-xs text-text-muted">
						No files
					</div>
				) : (
					<div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
						{rowVirtualizer.getVirtualItems().map((virtualRow) => {
							const row = rows[virtualRow.index]
							return (
								<div
									key={virtualRow.key}
									className="absolute left-0 top-0 w-full"
									style={{
										height: `${virtualRow.size}px`,
										transform: `translateY(${virtualRow.start}px)`,
									}}
								>
									{row.kind === "create" ? (
										<div
											className="flex items-center gap-1 h-[26px] px-1.5"
											style={{ paddingLeft: `${row.depth * 12 + 6}px` }}
										>
											{row.createType === "folder" ? (
												<FolderPlusIcon size={12} className="text-text-muted flex-shrink-0" />
											) : (
												<FilePlusIcon size={12} className="text-text-muted flex-shrink-0" />
											)}
											<InlineInput
												defaultValue={row.createType === "folder" ? "New Folder" : "Untitled.md"}
												onConfirm={(name) => handleConfirmCreate(row.parentPath, name)}
												onCancel={handleCancelCreate}
												selectBaseName={row.createType === "file"}
											/>
										</div>
									) : (
										<MemoizedTreeNodeView
											node={row.node}
											depth={row.depth}
											isActive={!row.node.isDir && activeTab?.filePath === row.node.path}
											isExpanded={expanded.has(row.node.path)}
											isRenaming={renamingPath === row.node.path}
											onToggle={handleToggle}
											onOpenFile={openTab}
											onStartRename={setRenamingPath}
											onConfirmRename={handleConfirmRename}
											onCancelRename={handleCancelRename}
											onDelete={handleDelete}
											onDuplicate={handleDuplicate}
											onReveal={handleReveal}
											onCopyPath={handleCopyPath}
											onNewFile={handleNewFile}
											onNewFolder={handleNewFolder}
											onViewHistory={setHistoryFilePath}
										/>
									)}
								</div>
							)
						})}
					</div>
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
