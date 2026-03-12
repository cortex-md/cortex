import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Kbd,
} from "@cortex/ui"
import { useCallback, useMemo } from "react"

function relativePath(filePath: string, vaultPath: string): string {
	return filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length + 1) : filePath
}

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

function parentFolder(relPath: string): string {
	const parts = relPath.split("/")
	return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

export function QuickFinder() {
	const { query, results, setQuery, indexing, documentCount } = useSearchStore()
	const { quickFinderOpen, toggleQuickFinder } = useUIStore()
	const { vault, files, createFile } = useVaultStore()
	const { openTab, panes, recentlyClosed } = useWorkspaceStore()

	const noteFiles = useMemo(() => {
		return files.filter((f) => !f.isDir)
	}, [files])

	const handleQueryChange = useCallback(
		(value: string) => {
			setQuery(value)
		},
		[setQuery],
	)

	const recentFilePaths = useMemo(() => {
		const paths: string[] = []
		for (const pane of Object.values(panes)) {
			for (const tab of [...pane.tabs].sort((a, b) => b.lastAccessed - a.lastAccessed)) {
				if (!paths.includes(tab.filePath)) {
					paths.push(tab.filePath)
				}
			}
		}
		for (const closed of recentlyClosed) {
			if (!paths.includes(closed.filePath)) {
				paths.push(closed.filePath)
			}
		}
		return paths.slice(0, 15)
	}, [panes, recentlyClosed])

	const handleSelect = useCallback(
		(filePath: string) => {
			openTab(filePath)
			toggleQuickFinder()
		},
		[openTab, toggleQuickFinder],
	)

	const handleCreateNote = useCallback(
		async (name: string) => {
			if (!vault || !name.trim()) return
			const filePath = await createFile(vault.path, name.trim())
			openTab(filePath)
			toggleQuickFinder()
		},
		[vault, createFile, openTab, toggleQuickFinder],
	)

	if (!vault) return null

	const vaultPath = vault.path

	return (
		<Dialog open={quickFinderOpen} onOpenChange={() => toggleQuickFinder}>
			<DialogContent className="p-10 max-h-[600px]  md:max-w-[500px] lg:max-w-[700px]">
				<DialogHeader>
					<DialogTitle>
						<Input
							placeholder="Search or create note..."
							onChange={(e) => handleQueryChange(e.target.value)}
						/>
					</DialogTitle>
				</DialogHeader>
				{results ? (
					<>
						{recentFilePaths.map((filePath: string) => {
							const relPath = relativePath(filePath, vaultPath)
							const folder = parentFolder(relPath)

							return (
								<div key={filePath} value={relPath} onClick={() => handleSelect(filePath)}>
									<span className="flex-1 truncate">{titleFromPath(filePath)}</span>

									{folder && (
										<span className="flex items-center gap-1 text-xs text-muted-foreground">
											{folder}
										</span>
									)}
								</div>
							)
						})}

						{noteFiles.map((file) => {
							const relPath = relativePath(file.path, vaultPath)
							const folder = parentFolder(relPath)

							return (
								<div key={file.path} value={relPath} onClick={() => handleSelect(file.path)}>
									<span className="flex-1 truncate">{titleFromPath(file.path)}</span>

									{folder && (
										<span className="flex items-center gap-1 text-xs text-muted-foreground">
											{folder}
										</span>
									)}
								</div>
							)
						})}
					</>
				) : (
					<span>No results found</span>
				)}

				<DialogFooter className="flex items-center justify-center w-full text-xs">
					<Kbd>Shift + Enter</Kbd>
					to create a new note
					<Kbd>Cntrl + Enter to open the note in a new tab</Kbd>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
