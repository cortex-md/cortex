import { useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import type { VersionInfo } from "@cortex/platform"
import { getThemeManager } from "@cortex/theme"
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
import type { FileDiffMetadata } from "@pierre/diffs"
import { parseDiffFromFile } from "@pierre/diffs"
import { FileDiff } from "@pierre/diffs/react"
import { Clock, RotateCcw, User } from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"

function useIsDarkTheme(): boolean {
	const [isDark, setIsDark] = useState(() => getThemeManager().getActiveTheme().isDark)
	useEffect(() => {
		return getThemeManager().subscribe((theme) => setIsDark(theme.isDark))
	}, [])
	return isDark
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

interface VersionRowProps {
	version: VersionInfo
	isSelected: boolean
	isLatest: boolean
	onSelect: () => void
}

function VersionRow({ version, isSelected, isLatest, onSelect }: VersionRowProps) {
	return (
		<Button
			variant={"ghost"}
			onClick={onSelect}
			className={`flex flex-col items-start w-full h-16 ${isSelected ? "bg-accent! border-none" : ""}`}
		>
			<div className="flex items-center gap-2">
				<User size={12} className="text-text-muted shrink-0" />
				<span className="text-xs font-medium text-text-primary flex-1 truncate">
					{version.authorName ?? "Unknown"}
				</span>
				{isLatest && (
					<Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
						latest
					</Badge>
				)}
			</div>
			<div className="flex items-center gap-2 pl-5"></div>
			<span className="flex items-center gap-1 text-[11px] text-text-muted">
				<Clock size={10} />
				{formatVersionDate(version.createdAt)}
			</span>
		</Button>
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
	const isDark = useIsDarkTheme()

	const [versions, setVersions] = useState<VersionInfo[]>([])
	const [selectedVersion, setSelectedVersion] = useState<VersionInfo | null>(null)
	const [previousContent, setPreviousContent] = useState<string | null>(null)
	const [currentContent, setCurrentContent] = useState<string | null>(null)
	const [loadingVersions, setLoadingVersions] = useState(false)
	const [loadingDiff, setLoadingDiff] = useState(false)
	const [restoring, setRestoring] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const relativeFilePath = vault?.path ? filePath.replace(`${vault.path}/`, "") : filePath
	const fileName = filePath.split("/").pop() ?? filePath

	const fileDiff = useMemo<FileDiffMetadata | null>(() => {
		if (currentContent === null) return null
		return parseDiffFromFile(
			{ name: fileName, contents: previousContent ?? "" },
			{ name: fileName, contents: currentContent },
		)
	}, [previousContent, currentContent, fileName])

	const addedLines = useMemo(
		() => fileDiff?.hunks.reduce((sum, h) => sum + h.additionLines, 0) ?? 0,
		[fileDiff],
	)
	const removedLines = useMemo(
		() => fileDiff?.hunks.reduce((sum, h) => sum + h.deletionLines, 0) ?? 0,
		[fileDiff],
	)

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
			setPreviousContent(null)
			setCurrentContent(null)
			setError(null)
		}
	}, [open, loadVersions])

	const handleSelectVersion = useCallback(
		async (version: VersionInfo) => {
			if (!vault?.path || !linkedVaultId) return

			setSelectedVersion(version)
			setLoadingDiff(true)
			setPreviousContent(null)
			setCurrentContent(null)

			try {
				const current = await downloadVersion(
					linkedVaultId,
					vault.path,
					relativeFilePath,
					String(version.version),
				)

				const versionIndex = versions.findIndex((v) => v.snapshotId === version.snapshotId)
				const previousVersion = versions[versionIndex + 1]

				if (!previousVersion) {
					setPreviousContent("")
					setCurrentContent(current)
				} else {
					const previous = await downloadVersion(
						linkedVaultId,
						vault.path,
						relativeFilePath,
						String(previousVersion.version),
					)
					setPreviousContent(previous)
					setCurrentContent(current)
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
									{!loadingDiff && fileDiff && (
										<div className="px-4 py-2 flex gap-4 text-xs text-text-muted">
											<span className="text-status-success-foreground">+{addedLines} added</span>
											<Separator orientation="vertical" className="h-4" />
											<span className="text-status-error-foreground">-{removedLines} removed</span>
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
						</div>

						<ScrollArea className="flex-1">
							{error && (
								<div className="m-4 rounded-md border border-status-error-border bg-status-error-background p-3 text-sm text-status-error-foreground">
									{error}
								</div>
							)}
							{loadingDiff && (
								<div className="flex items-center justify-center py-12">
									<Spinner className="size-5 text-text-muted" />
								</div>
							)}
							{!loadingDiff && !fileDiff && !error && (
								<div className="flex items-center justify-center py-12 text-text-muted text-sm">
									Select a version from the left to view changes
								</div>
							)}
							{!loadingDiff && fileDiff && (
								<FileDiff
									fileDiff={fileDiff}
									options={{
										theme: { dark: "pierre-dark", light: "pierre-light" },
										themeType: isDark ? "dark" : "light",
										diffStyle: "unified",
										lineDiffType: "word",
										disableFileHeader: true,
										overflow: "wrap",
									}}
								/>
							)}
						</ScrollArea>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
