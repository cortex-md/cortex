import { useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import type { DeletedFileInfo } from "@cortex/platform"
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	Input,
	ScrollArea,
	Spinner,
} from "@cortex/ui"
import { Clock, FileText, FolderOpen, RotateCcw, Search, Trash2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

function formatDeletedDate(dateString: string | null): string {
	if (!dateString) return "Unknown date"
	const date = new Date(dateString)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
		if (diffHours === 0) {
			const diffMins = Math.floor(diffMs / (1000 * 60))
			return `${diffMins}m ago`
		}
		return `${diffHours}h ago`
	}
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 30) return `${diffDays}d ago`

	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
	})
}

function formatFileSize(bytes: number | null): string {
	if (bytes === null || bytes === undefined) return ""
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function extractFileName(filePath: string): string {
	return filePath.split("/").pop() ?? filePath
}

function extractDirectory(filePath: string): string {
	const parts = filePath.split("/")
	if (parts.length <= 1) return ""
	return parts.slice(0, -1).join("/")
}

interface DeletedFileRowProps {
	file: DeletedFileInfo
	isSelected: boolean
	onSelect: () => void
	onRestore: () => void
	restoring: boolean
}

function DeletedFileRow({ file, isSelected, onSelect, onRestore, restoring }: DeletedFileRowProps) {
	const fileName = extractFileName(file.filePath)
	const directory = extractDirectory(file.filePath)

	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full text-left px-3 py-2.5 rounded-md transition-colors flex flex-col gap-1 ${
				isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-bg-secondary"
			}`}
		>
			<div className="flex items-center gap-2">
				<FileText size={14} className="text-text-muted shrink-0" />
				<span className="text-sm font-medium text-text-primary flex-1 truncate">{fileName}</span>
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={(e) => {
						e.stopPropagation()
						onRestore()
					}}
					disabled={restoring}
					title="Restore file"
				>
					{restoring ? <Spinner className="size-3" /> : <RotateCcw size={12} />}
				</Button>
			</div>
			{directory && (
				<div className="flex items-center gap-1 pl-6">
					<FolderOpen size={10} className="text-text-muted shrink-0" />
					<span className="text-[11px] text-text-muted truncate">{directory}</span>
				</div>
			)}
			<div className="flex items-center gap-3 pl-6">
				<span className="flex items-center gap-1 text-[11px] text-text-muted">
					<Clock size={10} />
					{formatDeletedDate(file.deletedAt)}
				</span>
				{file.sizeBytes !== null && (
					<span className="text-[11px] text-text-muted">{formatFileSize(file.sizeBytes)}</span>
				)}
				<Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
					v{file.version}
				</Badge>
			</div>
		</button>
	)
}

interface DeletedNotesPanelProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function DeletedNotesPanel({ open, onOpenChange }: DeletedNotesPanelProps) {
	const { vault } = useVaultStore()
	const { linkedVaultId } = useRemoteVaultStore()
	const { listDeletedFiles, restoreDeletedFile, downloadVersion } = useSyncStore()

	const [deletedFiles, setDeletedFiles] = useState<DeletedFileInfo[]>([])
	const [selectedFile, setSelectedFile] = useState<DeletedFileInfo | null>(null)
	const [previewContent, setPreviewContent] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [loadingPreview, setLoadingPreview] = useState(false)
	const [restoringPath, setRestoringPath] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [searchQuery, setSearchQuery] = useState("")

	const loadDeletedFiles = useCallback(async () => {
		if (!vault?.path || !linkedVaultId) {
			setError("Vault is not linked to a remote vault")
			return
		}
		setLoading(true)
		setError(null)
		try {
			const files = await listDeletedFiles(linkedVaultId, vault.path)
			files.sort((a, b) => {
				const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
				const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
				return dateB - dateA
			})
			setDeletedFiles(files)
		} catch (e) {
			setError(String(e))
		} finally {
			setLoading(false)
		}
	}, [vault?.path, linkedVaultId, listDeletedFiles])

	useEffect(() => {
		if (open) {
			loadDeletedFiles()
		} else {
			setDeletedFiles([])
			setSelectedFile(null)
			setPreviewContent(null)
			setError(null)
			setSearchQuery("")
		}
	}, [open, loadDeletedFiles])

	const filteredFiles = useMemo(() => {
		if (!searchQuery.trim()) return deletedFiles
		const query = searchQuery.toLowerCase()
		return deletedFiles.filter((f) => f.filePath.toLowerCase().includes(query))
	}, [deletedFiles, searchQuery])

	const handleSelectFile = useCallback(
		async (file: DeletedFileInfo) => {
			if (!vault?.path || !linkedVaultId) return

			setSelectedFile(file)
			setLoadingPreview(true)
			setPreviewContent(null)

			try {
				const content = await downloadVersion(linkedVaultId, vault.path, file.filePath, "0")
				setPreviewContent(content)
			} catch (e) {
				setPreviewContent(`Failed to load preview: ${String(e)}`)
			} finally {
				setLoadingPreview(false)
			}
		},
		[vault?.path, linkedVaultId, downloadVersion],
	)

	const handleRestore = useCallback(
		async (file: DeletedFileInfo) => {
			if (!vault?.path || !linkedVaultId) return

			setRestoringPath(file.filePath)
			try {
				await restoreDeletedFile(linkedVaultId, vault.path, file.filePath)
				setDeletedFiles((prev) => prev.filter((f) => f.filePath !== file.filePath))
				if (selectedFile?.filePath === file.filePath) {
					setSelectedFile(null)
					setPreviewContent(null)
				}
			} catch (e) {
				setError(String(e))
			} finally {
				setRestoringPath(null)
			}
		},
		[vault?.path, linkedVaultId, restoreDeletedFile, selectedFile],
	)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 md:max-h-[640px] md:max-w-[900px] lg:max-w-[1100px]">
				<DialogTitle className="sr-only">Deleted Notes</DialogTitle>
				<DialogDescription className="sr-only">
					View and restore deleted notes from your vault
				</DialogDescription>

				<div className="flex h-[600px] overflow-hidden">
					<div className="w-72 shrink-0 border-r border-border flex flex-col">
						<div className="px-4 py-3 space-y-2">
							<div className="flex items-center gap-2">
								<Trash2 size={14} className="text-text-muted" />
								<p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
									Deleted Notes
								</p>
								{!loading && deletedFiles.length > 0 && (
									<Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 ml-auto">
										{deletedFiles.length}
									</Badge>
								)}
							</div>
							<div className="relative">
								<Search
									size={14}
									className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
								/>
								<Input
									placeholder="Search deleted files..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-8 h-8 text-xs"
								/>
							</div>
						</div>

						<ScrollArea className="flex-1">
							<div className="p-2 flex flex-col gap-1">
								{loading && (
									<div className="flex items-center justify-center py-8">
										<Spinner className="size-4 text-text-muted" />
									</div>
								)}
								{!loading && filteredFiles.length === 0 && !error && (
									<p className="text-xs text-text-muted text-center py-8">
										{searchQuery ? "No matching files" : "No deleted notes"}
									</p>
								)}
								{filteredFiles.map((file) => (
									<DeletedFileRow
										key={file.filePath}
										file={file}
										isSelected={selectedFile?.filePath === file.filePath}
										onSelect={() => handleSelectFile(file)}
										onRestore={() => handleRestore(file)}
										restoring={restoringPath === file.filePath}
									/>
								))}
							</div>
						</ScrollArea>
					</div>

					<div className="flex-1 flex flex-col overflow-hidden">
						{selectedFile ? (
							<>
								<div className="px-4 py-3 flex items-center justify-between border-b border-border">
									<div className="flex flex-col min-w-0 flex-1">
										<p className="text-sm font-medium text-text-primary truncate">
											{extractFileName(selectedFile.filePath)}
										</p>
										<p className="text-xs text-text-muted truncate">
											{selectedFile.filePath} · Deleted {formatDeletedDate(selectedFile.deletedAt)}
										</p>
									</div>
									<Button
										variant="secondary"
										size="sm"
										onClick={() => handleRestore(selectedFile)}
										disabled={restoringPath === selectedFile.filePath}
										className="gap-1.5 ml-4 shrink-0"
									>
										{restoringPath === selectedFile.filePath ? (
											<Spinner className="size-3" />
										) : (
											<RotateCcw size={12} />
										)}
										Restore
									</Button>
								</div>

								<ScrollArea className="flex-1">
									{loadingPreview && (
										<div className="flex items-center justify-center py-12">
											<Spinner className="size-5 text-text-muted" />
										</div>
									)}
									{!loadingPreview && previewContent !== null && (
										<div className="p-4">
											<pre className="text-xs leading-5 text-text-secondary whitespace-pre-wrap font-mono break-all">
												{previewContent}
											</pre>
										</div>
									)}
								</ScrollArea>
							</>
						) : (
							<div className="flex-1 flex items-center justify-center text-text-muted text-sm">
								Select a deleted note to preview its content
							</div>
						)}

						{error && (
							<div className="mx-4 mb-4 p-3 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
								{error}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
