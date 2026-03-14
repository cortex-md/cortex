import { useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import type { VersionInfo } from "@cortex/platform"
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	ScrollArea,
	Separator,
	Spinner,
} from "@cortex/ui"
import { Clock, Monitor, RotateCcw, Tag, User } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface DiffLine {
	type: "added" | "removed" | "unchanged"
	content: string
	key: string
}

function computeLineDiff(previousContent: string, currentContent: string): DiffLine[] {
	const previousLines = previousContent.split("\n")
	const currentLines = currentContent.split("\n")

	const rows = previousLines.length + 1
	const cols = currentLines.length + 1
	const table = Array.from({ length: rows }, () => new Array(cols).fill(0))

	for (let i = 1; i < rows; i++) {
		for (let j = 1; j < cols; j++) {
			if (previousLines[i - 1] === currentLines[j - 1]) {
				table[i][j] = table[i - 1][j - 1] + 1
			} else {
				table[i][j] = Math.max(table[i - 1][j], table[i][j - 1])
			}
		}
	}

	const reversed: Array<{ type: "added" | "removed" | "unchanged"; content: string }> = []
	let i = previousLines.length
	let j = currentLines.length

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && previousLines[i - 1] === currentLines[j - 1]) {
			reversed.push({ type: "unchanged", content: previousLines[i - 1] })
			i--
			j--
		} else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
			reversed.push({ type: "added", content: currentLines[j - 1] })
			j--
		} else {
			reversed.push({ type: "removed", content: previousLines[i - 1] })
			i--
		}
	}

	return reversed.reverse().map((line, position) => ({ ...line, key: `${line.type}-${position}` }))
}

function formatVersionDate(dateString: string | null): string {
	if (!dateString) return "Unknown date"
	const date = new Date(dateString)
	return date.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}

interface DiffViewProps {
	diffLines: DiffLine[]
}

function DiffView({ diffLines }: DiffViewProps) {
	const hasChanges = diffLines.some((line) => line.type !== "unchanged")

	if (!hasChanges) {
		return (
			<div className="flex items-center justify-center py-8 text-text-muted text-sm">
				No changes compared to previous version
			</div>
		)
	}

	return (
		<div className="font-mono w-full text-xs leading-5 overflow-x-auto">
			{diffLines.map((line) => {
				const prefix = line.type === "added" ? "+" : line.type === "removed" ? "-" : " "
				const bgClass =
					line.type === "added"
						? "bg-green-500/10 text-green-700 dark:text-green-400"
						: line.type === "removed"
							? "bg-red-500/10 text-red-700 dark:text-red-400"
							: "text-text-secondary"

				return (
					<div key={line.key} className={`flex gap-2 px-3 py-0.5 whitespace-pre-wrap ${bgClass}`}>
						<span className="select-none w-4 shrink-0 text-text-muted">{prefix}</span>
						<span className="break-all">{line.content}</span>
					</div>
				)
			})}
		</div>
	)
}

interface VersionRowProps {
	version: VersionInfo
	isSelected: boolean
	isLatest: boolean
	onSelect: () => void
}

function VersionRow({ version, isSelected, isLatest, onSelect }: VersionRowProps) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`w-full text-left px-3 py-2.5 rounded-md transition-colors flex flex-col gap-0.5 ${
				isSelected ? "bg-accent/10 border border-accent/30" : "hover:bg-bg-secondary"
			}`}
		>
			<div className="flex items-center gap-2">
				<User size={12} className="text-text-muted shrink-0" />
				<span className="text-xs font-medium text-text-primary flex-1 truncate">
					{version.authorName ?? "Unknown"}
				</span>
			</div>
			<div className="flex items-center gap-2 pl-5">
				<span className="flex items-center gap-1 text-[11px] text-text-muted">
					<Tag size={10} />v{version.version}
				</span>
				{isLatest && (
					<Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
						latest
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-3 pl-5">
				<span className="flex items-center gap-1 text-[11px] text-text-muted">
					<Clock size={10} />
					{formatVersionDate(version.createdAt)}
				</span>
				{(version.deviceName ?? version.deviceId) && (
					<span className="flex items-center gap-1 text-[11px] text-text-muted">
						<Monitor size={10} />
						{version.deviceName ?? version.deviceId?.slice(0, 8)}
					</span>
				)}
			</div>
		</button>
	)
}

interface NoteHistoryPanelProps {
	filePath: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function NoteHistoryPanel({ filePath, open, onOpenChange }: NoteHistoryPanelProps) {
	const { vault } = useVaultStore()
	const { linkedVaultId } = useRemoteVaultStore()
	const { getVersionHistory, downloadVersion, restoreVersion } = useSyncStore()

	const [versions, setVersions] = useState<VersionInfo[]>([])
	const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null)
	const [diffLines, setDiffLines] = useState<DiffLine[] | null>(null)
	const [loadingVersions, setLoadingVersions] = useState(false)
	const [loadingDiff, setLoadingDiff] = useState(false)
	const [restoring, setRestoring] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const relativeFilePath = vault?.path ? filePath.replace(`${vault.path}/`, "") : filePath

	const loadVersions = useCallback(async () => {
		if (!vault?.path || !linkedVaultId) {
			setError("Vault is not linked to a remote vault")
			return
		}
		setLoadingVersions(true)
		setError(null)
		try {
			const history = await getVersionHistory(linkedVaultId, vault.path, relativeFilePath)
			setVersions(history.sort((a, b) => b.version - a.version))
		} catch (e) {
			setError(String(e))
		} finally {
			setLoadingVersions(false)
		}
	}, [vault?.path, linkedVaultId, relativeFilePath, getVersionHistory])

	useEffect(() => {
		if (open) {
			loadVersions()
		} else {
			setVersions([])
			setSelectedVersion(null)
			setDiffLines(null)
			setError(null)
		}
	}, [open, loadVersions])

	const handleSelectVersion = useCallback(
		async (version: VersionInfo) => {
			if (!vault?.path || !linkedVaultId) return

			setSelectedVersion(version)
			setLoadingDiff(true)
			setDiffLines(null)

			try {
				const currentContent = await downloadVersion(
					linkedVaultId,
					vault.path,
					relativeFilePath,
					String(version.version),
				)

				const versionIndex = versions.findIndex((v) => v.snapshotId === version.snapshotId)
				const previousVersion = versions[versionIndex + 1]

				if (!previousVersion) {
					setDiffLines(computeLineDiff("", currentContent))
				} else {
					const previousContent = await downloadVersion(
						linkedVaultId,
						vault.path,
						relativeFilePath,
						String(previousVersion.version),
					)
					setDiffLines(computeLineDiff(previousContent, currentContent))
				}
			} catch (e) {
				setError(String(e))
			} finally {
				setLoadingDiff(false)
			}
		},
		[vault?.path, linkedVaultId, relativeFilePath, downloadVersion, versions],
	)

	const handleRestore = useCallback(async () => {
		if (!selectedVersion || !vault?.path || !linkedVaultId) return

		setRestoring(true)
		try {
			await restoreVersion(
				linkedVaultId,
				vault.path,
				relativeFilePath,
				String(selectedVersion.version),
			)
			onOpenChange(false)
		} catch (e) {
			setError(String(e))
		} finally {
			setRestoring(false)
		}
	}, [selectedVersion, vault?.path, linkedVaultId, relativeFilePath, restoreVersion, onOpenChange])

	const fileName = filePath.split("/").pop() ?? filePath

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 md:max-h-[640px] md:max-w-[900px] lg:max-w-[1100px]">
				<DialogTitle className="sr-only">Note History — {fileName}</DialogTitle>
				<DialogDescription className="sr-only">
					View and restore previous versions of {fileName}
				</DialogDescription>

				<div className="flex h-[600px] overflow-hidden">
					<div className="w-64 shrink-0 border-r border-border flex flex-col">
						<div className="px-4 py-3">
							<p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
								History
							</p>
							<p className="text-sm font-medium text-text-primary mt-0.5 truncate">{fileName}</p>
						</div>

						<ScrollArea className="flex-1">
							<div className="p-2 flex flex-col gap-1">
								{loadingVersions && (
									<div className="flex items-center justify-center py-8">
										<Spinner className="size-4 text-text-muted" />
									</div>
								)}
								{!loadingVersions && versions.length === 0 && !error && (
									<p className="text-xs text-text-muted text-center py-8">No history found</p>
								)}
								{versions.map((version, index) => (
									<VersionRow
										key={version.snapshotId}
										version={version}
										isSelected={selectedVersion?.snapshotId === version.snapshotId}
										isLatest={index === 0}
										onSelect={() => handleSelectVersion(version)}
									/>
								))}
							</div>
						</ScrollArea>
					</div>

					<div className="flex-1 flex flex-col overflow-hidden">
						<div className="px-4 py-3 flex flex-col items-center justify-between">
							{selectedVersion ? (
								<div className="flex items-center w-full justify-start gap-2">
									<div className="flex flex-col">
										<p className="text-sm font-medium text-text-primary">
											{selectedVersion.authorName ?? "Unknown"} · v{selectedVersion.version}
										</p>
										<p className="text-xs text-text-muted">
											{formatVersionDate(selectedVersion.createdAt)}
										</p>
									</div>
									{!loadingDiff && diffLines && (
										<div className="px-4 py-2 flex gap-4 text-xs text-text-muted">
											<span className="text-green-600 dark:text-green-400">
												+{diffLines.filter((l) => l.type === "added").length} added
											</span>
											<Separator orientation="vertical" className="h-4" />
											<span className="text-red-600 dark:text-red-400">
												-{diffLines.filter((l) => l.type === "removed").length} removed
											</span>
										</div>
									)}
									<Button
										variant="secondary"
										size="sm"
										onClick={handleRestore}
										disabled={restoring}
										className="gap-1.5 ml-auto mr-10"
									>
										{restoring ? <Spinner className="size-3" /> : <RotateCcw size={12} />}
										Restore
									</Button>
								</div>
							) : (
								<p className="text-sm text-text-muted">Select a version to view changes</p>
							)}
							{!loadingDiff && diffLines && <DiffView diffLines={diffLines} />}
						</div>

						<ScrollArea className="flex-1">
							{error && (
								<div className="m-4 p-3 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-sm">
									{error}
								</div>
							)}
							{loadingDiff && (
								<div className="flex items-center justify-center py-12">
									<Spinner className="size-5 text-text-muted" />
								</div>
							)}
							{!loadingDiff && !diffLines && !error && (
								<div className="flex items-center justify-center py-12 text-text-muted text-sm">
									Select a version from the left to view changes
								</div>
							)}
						</ScrollArea>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
