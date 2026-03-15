import { useSyncStore, useVaultStore } from "@cortex/core"
import type { FileEntry } from "@cortex/platform"
import { Badge, Input } from "@cortex/ui"
import { FileIcon, FolderIcon, XIcon } from "lucide-react"
import { useCallback, useMemo, useRef, useState } from "react"

function fileEntryToRelativePath(entry: FileEntry, vaultPath: string): string {
	const relative = entry.path.replace(`${vaultPath}/`, "")
	return entry.isDir ? (relative.endsWith("/") ? relative : `${relative}/`) : relative
}

export function ExcludedPathsSettings() {
	const files = useVaultStore((s) => s.files)
	const vault = useVaultStore((s) => s.vault)
	const excludedPaths = useSyncStore((s) => s.syncPreferences.excludedPaths)
	const toggleExcludedPath = useSyncStore((s) => s.toggleExcludedPath)
	const [search, setSearch] = useState("")
	const [dropdownOpen, setDropdownOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	const availableOptions = useMemo(() => {
		if (!vault?.path) return []
		return files
			.map((f) => fileEntryToRelativePath(f, vault.path))
			.filter((p) => !p.startsWith(".cortex/") && !p.startsWith(".cortex"))
			.filter((p) => !excludedPaths.includes(p))
	}, [files, vault?.path, excludedPaths])

	const filteredOptions = useMemo(() => {
		if (!search.trim()) return availableOptions
		const lower = search.toLowerCase()
		return availableOptions.filter((p) => p.toLowerCase().includes(lower))
	}, [availableOptions, search])

	const handleSelect = useCallback(
		(path: string) => {
			toggleExcludedPath(path, true)
			setSearch("")
			setDropdownOpen(false)
			inputRef.current?.blur()
		},
		[toggleExcludedPath],
	)

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

			<div className="relative">
				<Input
					ref={inputRef}
					value={search}
					onChange={(e) => {
						setSearch(e.target.value)
						setDropdownOpen(true)
					}}
					onFocus={() => setDropdownOpen(true)}
					onBlur={() => {
						setTimeout(() => setDropdownOpen(false), 150)
					}}
					placeholder="Search files and folders to exclude..."
				/>
				{dropdownOpen && filteredOptions.length > 0 && (
					<div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
						{filteredOptions.map((path) => (
							<button
								key={path}
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={() => handleSelect(path)}
								className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-accent cursor-pointer"
							>
								{path.endsWith("/") ? (
									<FolderIcon className="size-3.5 shrink-0 text-text-muted" />
								) : (
									<FileIcon className="size-3.5 shrink-0 text-text-muted" />
								)}
								<span className="truncate">{path}</span>
							</button>
						))}
					</div>
				)}
				{dropdownOpen && search.trim() && filteredOptions.length === 0 && (
					<div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
						<p className="px-3 py-2 text-sm text-text-muted text-center">
							No matching files or folders
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
