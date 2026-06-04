import {
	isSyncImagePath,
	normalizeSyncPathPattern,
	shouldIgnoreSyncPath,
	useSyncStore,
	useVaultStore,
} from "@cortex/core"
import type { FileEntry } from "@cortex/platform"
import { Badge, Button, Field, FieldLabel, FolderPicker, Input, Switch } from "@cortex/ui"
import { FileIcon, FolderIcon, PlusIcon, XIcon } from "lucide-react"
import { type ChangeEvent, type KeyboardEvent, useMemo, useState } from "react"

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
	const updateSyncPreference = useSyncStore((s) => s.updateSyncPreference)
	const [patternInput, setPatternInput] = useState("")
	const normalizedPatternInput = normalizeSyncPathPattern(patternInput)

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

	const handleAddPattern = async () => {
		if (!normalizedPatternInput || excludedPaths.includes(normalizedPatternInput)) return
		await toggleExcludedPath(normalizedPatternInput, true)
		setPatternInput("")
	}

	const handlePatternKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") {
			event.preventDefault()
			handleAddPattern()
		}
	}

	return (
		<div>
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Excluded from Sync
			</h3>
			<p className="text-xs text-text-muted mb-3">
				Files and folders excluded from sync will not be uploaded to the remote vault.
			</p>

			<Field orientation="horizontal" className="items-center justify-between py-2 mb-3">
				<FieldLabel htmlFor="ignore-sync-images">Ignore images</FieldLabel>
				<Switch
					id="ignore-sync-images"
					checked={syncPreferences.ignoreImages}
					onCheckedChange={(checked) => updateSyncPreference("ignoreImages", checked)}
				/>
			</Field>

			<Field className="mb-3">
				<FieldLabel htmlFor="sync-ignore-pattern">Ignore pattern</FieldLabel>
				<div className="flex gap-2">
					<Input
						id="sync-ignore-pattern"
						value={patternInput}
						onChange={(event: ChangeEvent<HTMLInputElement>) => setPatternInput(event.target.value)}
						onKeyDown={handlePatternKeyDown}
						placeholder="node_modules/, *.log, docs/**/*.tmp"
					/>
					<Button
						variant="secondary"
						size="sm"
						onClick={handleAddPattern}
						disabled={!normalizedPatternInput || excludedPaths.includes(normalizedPatternInput)}
						className="shrink-0"
					>
						<PlusIcon size={14} />
						Add
					</Button>
				</div>
			</Field>

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

			<FolderPicker
				options={availableOptions}
				value=""
				onChange={(path) => toggleExcludedPath(path, true)}
				placeholder="Search files and folders to exclude..."
			/>
		</div>
	)
}
