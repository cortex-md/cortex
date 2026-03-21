import { useSyncStore, useVaultStore } from "@cortex/core"
import type { FileEntry } from "@cortex/platform"
import { Badge, FolderPicker } from "@cortex/ui"
import { FileIcon, FolderIcon, XIcon } from "lucide-react"
import { useMemo } from "react"

function fileEntryToRelativePath(entry: FileEntry, vaultPath: string): string {
	const relative = entry.path.replace(`${vaultPath}/`, "")
	return entry.isDir ? (relative.endsWith("/") ? relative : `${relative}/`) : relative
}

export function ExcludedPathsSettings() {
	const files = useVaultStore((s) => s.files)
	const vault = useVaultStore((s) => s.vault)
	const excludedPaths = useSyncStore((s) => s.syncPreferences.excludedPaths)
	const toggleExcludedPath = useSyncStore((s) => s.toggleExcludedPath)

	const availableOptions = useMemo(() => {
		if (!vault?.path) return []
		return files
			.map((f) => fileEntryToRelativePath(f, vault.path))
			.filter((p) => !p.startsWith(".cortex/") && !p.startsWith(".cortex"))
			.filter((p) => !excludedPaths.includes(p))
			.map((p) => ({
				value: p,
				label: p,
				isDir: p.endsWith("/"),
			}))
	}, [files, vault?.path, excludedPaths])

	return (
		<div>
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Excluded from Sync
			</h3>
			<p className="text-xs text-text-muted mb-3">
				Files and folders excluded from sync will not be uploaded to the remote vault.
			</p>

			{excludedPaths.length > 0 && (
				<div className="flex flex-wrap gap-1.5 mb-3">
					{excludedPaths.map((path) => (
						<Badge
							key={path}
							variant="secondary"
							className="flex items-center gap-1.5 pl-2 pr-1 py-1"
						>
							{path.endsWith("/") ? (
								<FolderIcon className="size-3 shrink-0 text-text-muted" />
							) : (
								<FileIcon className="size-3 shrink-0 text-text-muted" />
							)}
							<span className="text-xs">{path}</span>
							<button
								type="button"
								onClick={() => toggleExcludedPath(path, false)}
								className="ml-0.5 p-0.5 rounded-sm hover:bg-bg-hover cursor-pointer"
							>
								<XIcon className="size-3" />
							</button>
						</Badge>
					))}
				</div>
			)}

			<FolderPicker
				options={availableOptions}
				value=""
				onChange={(path) => toggleExcludedPath(path, true)}
				placeholder="Search files and folders to exclude..."
			/>
		</div>
	)
}
