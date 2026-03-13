import { useTagsStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { Badge, Button, Input } from "@cortex/ui"
import { ChevronRightIcon, FileIcon, TagIcon, XIcon } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

function TagRow({
	tag,
	color,
	filePaths,
	vaultPath,
	isExpanded,
	onToggle,
	onOpenFile,
}: {
	tag: string
	color: string | null
	filePaths: string[]
	vaultPath: string
	isExpanded: boolean
	onToggle: (tag: string) => void
	onOpenFile: (filePath: string) => void
}) {
	return (
		<div>
			<Button
  			size={"sm"}
  			variant={"ghost"}
  			className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-accent/50 transition-colors cursor-pointer"
				onClick={() => onToggle(tag)}
			>
				<ChevronRightIcon
					className={`size-3 text-muted-foreground flex-shrink-0 transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
				/>
				<span
					className="inline-block size-2.5 rounded-full flex-shrink-0"
					style={{ backgroundColor: color ? color : "var(--accent)"}}
				/>
				<span className="flex-1 text-xs font-medium truncate">{tag}</span>
				<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 min-w-[20px]">
					{filePaths.length}
				</Badge>
			</Button>

			{isExpanded && (
				<div className="pb-1 px-2">
					{filePaths.map((filePath) => {
						const relPath = filePath.startsWith(vaultPath)
							? filePath.slice(vaultPath.length + 1)
							: filePath
						const fileName = relPath.split("/").pop()?.replace(/\.md$/, "") ?? relPath

						return (
							<Button
  							size={"sm"}
  							variant={"ghost"}
  							key={filePath}
								className="w-full flex items-center justify-start! gap-2 pl-20 pr-3 py-1 text-left hover:bg-accent/50 transition-colors cursor-pointer"
								onClick={() => onOpenFile(filePath)}
							>
								<FileIcon className="size-3 text-muted-foreground flex-shrink-0" />
								<span className="text-xs text-muted-foreground truncate">{fileName}</span>
							</Button>
						)
					})}
				</div>
			)}
		</div>
	)
}

export function TagsSidebar() {
	const vault = useVaultStore((s) => s.vault)
	const { openTab } = useWorkspaceStore()
	const { getAllTags, activeTagFilter, setActiveTagFilter } = useTagsStore()
	const [filterQuery, setFilterQuery] = useState("")
	const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set())

	const allTags = getAllTags()

	const filteredTags = useMemo(() => {
		if (!filterQuery.trim()) return allTags
		const query = filterQuery.toLowerCase()
		return allTags.filter((entry) => entry.tag.includes(query))
	}, [allTags, filterQuery])

	const handleToggleExpand = useCallback((tag: string) => {
		setExpandedTags((prev) => {
			const next = new Set(prev)
			if (next.has(tag)) {
				next.delete(tag)
			} else {
				next.add(tag)
			}
			return next
		})
	}, [])

	const handleOpenFile = useCallback(
		(filePath: string) => {
			openTab(filePath)
		},
		[openTab],
	)

	if (!vault) {
		return (
			<div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
				No vault open
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-2 border-b border-border">
				<div className="relative">
					<TagIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
					<Input
						type="text"
						value={filterQuery}
						onChange={(e) => setFilterQuery(e.target.value)}
						placeholder="Filter tags..."
						className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border focus:border-ring focus:outline-none placeholder:text-muted-foreground"
					/>
				</div>
				<div className="mt-1.5 text-[10px] text-muted-foreground">
					{allTags.length === 0
						? "No tags found"
						: `${allTags.length} tag${allTags.length !== 1 ? "s" : ""}`}
				</div>
			</div>

			{activeTagFilter && (
				<div className="px-3 py-1.5 border-b border-border bg-accent/20 flex items-center gap-2">
					<span className="text-[10px] text-muted-foreground">Filtering by:</span>
					<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 cursor-default">
						{activeTagFilter}
						<button
							type="button"
							className="hover:text-foreground transition-colors"
							onClick={() => setActiveTagFilter(null)}
						>
							<XIcon className="size-2.5" />
						</button>
					</Badge>
				</div>
			)}

			<div className="flex-1 overflow-y-auto">
				{filteredTags.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
						<TagIcon className="size-6 text-muted-foreground/50" />
						<p className="text-xs text-muted-foreground">
							{filterQuery ? "No tags match your filter" : "No tags in vault"}
						</p>
						{filterQuery && (
							<Button
								variant="ghost"
								size="sm"
								className="text-xs h-7"
								onClick={() => setFilterQuery("")}
							>
								Clear filter
							</Button>
						)}
					</div>
				) : (

  				<div className="flex flex-col gap-1 px-1 pt-2">
              {filteredTags.map((entry) => (
                <TagRow
                  key={entry.tag}
                  tag={entry.tag}
                  color={entry.color}
                  filePaths={entry.filePaths}
                  vaultPath={vault.path}
                  isExpanded={expandedTags.has(entry.tag)}
                  onToggle={handleToggleExpand}
                  onOpenFile={handleOpenFile}
                />
              ))}
  				</div>
					)}
			</div>
		</div>
	)
}
