import { useBookmarksStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { Button } from "@cortex/ui"
import { BookmarkIcon, FileIcon, FolderIcon, XIcon } from "lucide-react"
import { useCallback } from "react"

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

function folderFromPath(filePath: string, vaultPath: string): string {
	const relPath = filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length + 1) : filePath
	const parts = relPath.split("/")
	return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

export function BookmarksSidebar() {
	const vault = useVaultStore((s) => s.vault)
	const { bookmarks, removeBookmark } = useBookmarksStore()
	const { openTab } = useWorkspaceStore()

	const handleOpen = useCallback(
		(filePath: string) => {
			openTab(filePath)
		},
		[openTab],
	)

	const handleRemove = useCallback(
		(filePath: string) => {
			if (!vault) return
			removeBookmark(vault.path, filePath)
		},
		[vault, removeBookmark],
	)

	if (!vault) {
		return (
			<div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
				No vault open
			</div>
		)
	}

	if (bookmarks.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
				<BookmarkIcon className="size-6 text-muted-foreground/50" />
				<p className="text-xs text-muted-foreground">No bookmarks yet</p>
				<p className="text-[10px] text-muted-foreground/70">
					Right-click a file and select "Add to Bookmarks"
				</p>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-2 border-b border-border">
				<span className="text-[10px] text-muted-foreground">
					{bookmarks.length} bookmark{bookmarks.length !== 1 ? "s" : ""}
				</span>
			</div>

			<div className="flex-1 overflow-y-auto">
				{bookmarks.map((filePath) => {
					const folder = folderFromPath(filePath, vault.path)
					return (
						<div
							key={filePath}
							className="group flex items-center gap-2 px-3 py-1.5 hover:bg-accent/50 transition-colors"
						>
							<button
								type="button"
								className="flex-1 flex items-start gap-2 min-w-0 text-left"
								onClick={() => handleOpen(filePath)}
							>
								<FileIcon className="size-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
								<div className="min-w-0">
									<span className="text-xs font-medium truncate block">
										{titleFromPath(filePath)}
									</span>
									{folder && (
										<span className="flex items-center gap-1 text-[10px] text-muted-foreground">
											<FolderIcon className="size-2.5" />
											{folder}
										</span>
									)}
								</div>
							</button>
							<Button
								variant="ghost"
								size="sm"
								className="p-0.5 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
								onClick={() => handleRemove(filePath)}
							>
								<XIcon className="size-3 text-muted-foreground" />
							</Button>
						</div>
					)
				})}
			</div>
		</div>
	)
}
