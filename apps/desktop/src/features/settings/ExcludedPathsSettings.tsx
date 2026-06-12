import { isSyncImagePath, shouldIgnoreSyncPath, useSyncStore, useVaultStore } from "@cortex/core"
import type { FileEntry } from "@cortex/platform"
import { Badge, FolderPicker } from "@cortex/ui"
import { FileIcon, FolderIcon, XIcon } from "lucide-react"
import { useMemo } from "react"
import { SettingsBlock, SettingsEmptyState } from "./SettingsPrimitives"

function fileEntryToRelativePath(entry: FileEntry, vaultPath: string): string {
	const relative = entry.path.replace(`${vaultPath}/`, "")
	return entry.isDir ? (relative.endsWith("/") ? relative : `${relative}/`) : relative
}

export function ExcludedPathsSettings() {
	const files = useVaultStore((s) => s.files)
	const vault = useVaultStore((s) => s.vault)
	const syncPreferences = useSyncStore((s) => s.syncPreferences)
	const excludedPaths = syncPreferences.excludedPaths
	const toggleExcludedPath = useSyncStore((s) => s.toggleExcludedPath)

	const availableOptions = useMemo(() => {
		if (!vault?.path) return []
		return files
			.map((f) => fileEntryToRelativePath(f, vault.path))
			.filter((p) => !p.startsWith(".cortex/") && !p.startsWith(".cortex"))
			.filter((p) => !(syncPreferences.ignoreImages && isSyncImagePath(p)))
			.filter((p) => !shouldIgnoreSyncPath(p, syncPreferences))
			.map((p) => ({
				value: p,
				label: p,
				isDir: p.endsWith("/"),
			}))
	}, [files, vault?.path, syncPreferences])

	return (
		<SettingsBlock
			title="Excluded from Sync"
			description="Files, folders, and patterns excluded from sync will not be uploaded to the remote vault."
		>
			{excludedPaths.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-3">
					{excludedPaths.map((path) => (
						<Badge
							key={path}
							variant="secondary"
							className="flex items-center gap-1.5 pl-2 pr-1 py-1"
						>
							{path.replace(/^!/, "").endsWith("/") ? (
								<FolderIcon className="size-3 shrink-0 text-text-muted" />
							) : (
								<FileIcon className="size-3 shrink-0 text-text-muted" />
							)}
							<span className="text-xs">{path}</span>
							<button
								type="button"
								onClick={() => toggleExcludedPath(path, false)}
								className="ml-0.5 p-0.5 rounded-sm hover:bg-bg-hover"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}
			{excludedPaths.length === 0 && <SettingsEmptyState>No excluded paths</SettingsEmptyState>}

			<FolderPicker
				options={availableOptions}
				value=""
				onChange={(path) => toggleExcludedPath(path, true)}
				placeholder="Search files, folders, or add a pattern..."
				allowCustomValue
				getCustomValueLabel={(value) => `Add pattern "${value}"`}
			/>
		</SettingsBlock>
	)
}
