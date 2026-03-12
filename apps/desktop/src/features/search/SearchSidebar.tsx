import { useTagsStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import { Button, Input } from "@cortex/ui"
import { FileIcon, FolderIcon, SearchIcon, TagIcon, XIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

function highlightSnippet(snippet: string, query: string): React.ReactNode {
	if (!query.trim()) return snippet

	const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
	const regex = new RegExp(`(${terms.map(escapeRegex).join("|")})`, "gi")
	const parts = snippet.split(regex)

	return parts.map((part, i) => {
		const isMatch = terms.some((t) => part.toLowerCase() === t)
		if (isMatch) {
			return (
				// biome-ignore lint/suspicious/noArrayIndexKey: text fragment keys
				<mark key={i} className="bg-brand/30 text-inherit rounded-sm px-0.5">
					{part}
				</mark>
			)
		}
		return part
	})
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function folderFromPath(filePath: string): string {
	const parts = filePath.split("/")
	return parts.length > 1 ? parts.slice(0, -1).join("/") : ""
}

export function SearchSidebar() {
	const { query, results, search, setQuery, indexing, documentCount } = useSearchStore()
	const { openTab } = useWorkspaceStore()
	const vault = useVaultStore((s) => s.vault)
	const getAllTags = useTagsStore((s) => s.getAllTags)
	const inputRef = useRef<HTMLInputElement>(null)
	const [localQuery, setLocalQuery] = useState(query)
	const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	const allTags = getAllTags()

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const runSearch = useCallback(
		(queryValue: string, tag: string | null) => {
			if (tag) {
				search(queryValue, { tags: [tag] })
			} else {
				setQuery(queryValue)
			}
		},
		[search, setQuery],
	)

	const handleQueryChange = useCallback(
		(value: string) => {
			setLocalQuery(value)
			if (debounceRef.current) clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				runSearch(value, activeTagFilter)
			}, 150)
		},
		[runSearch, activeTagFilter],
	)

	const handleTagFilterSelect = useCallback(
		(tag: string | null) => {
			setActiveTagFilter(tag)
			runSearch(localQuery, tag)
		},
		[runSearch, localQuery],
	)

	const handleResultClick = useCallback(
		(id: string) => {
			if (!vault) return
			openTab(`${vault.path}/${id}`)
		},
		[vault, openTab],
	)

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-2 border-b border-border">
				<div className="relative">
					<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
					<Input
						ref={inputRef}
						type="text"
						value={localQuery}
						onChange={(e) => handleQueryChange(e.target.value)}
						placeholder="Search in vault..."
						className="w-full h-8 pl-8 pr-3 text-sm bg-input rounded-md border border-border focus:border-ring focus:outline-none placeholder:text-muted-foreground"
					/>
				</div>

				{allTags.length > 0 && (
					<div className="mt-2 flex flex-wrap gap-1">
						{allTags.slice(0, 8).map((entry) => (
							<button
								key={entry.tag}
								type="button"
								onClick={() =>
									handleTagFilterSelect(activeTagFilter === entry.tag ? null : entry.tag)
								}
								className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
									activeTagFilter === entry.tag
										? "bg-brand/20 border-brand/40 text-brand"
										: "bg-transparent border-border/60 text-muted-foreground hover:border-border hover:text-text-primary"
								}`}
							>
								<TagIcon className="size-2.5" />
								{entry.tag}
							</button>
						))}
					</div>
				)}

				<div className="mt-1.5 flex items-center justify-between">
					<span className="text-[10px] text-muted-foreground">
						{indexing
							? "Indexing..."
							: query || activeTagFilter
								? `${results.length} result${results.length !== 1 ? "s" : ""}`
								: `${documentCount} notes indexed`}
					</span>
					{activeTagFilter && (
						<button
							type="button"
							onClick={() => handleTagFilterSelect(null)}
							className="inline-flex items-center gap-1 text-[10px] text-brand hover:text-brand/70 transition-colors"
						>
							<XIcon className="size-3" />
							Clear filter
						</button>
					)}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{results.length === 0 && (query || activeTagFilter) && !indexing && (
					<div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
						No results found
					</div>
				)}

				{results.map((result) => {
					const folder = folderFromPath(result.id)
					return (
						<Button
							variant={"ghost"}
							type="button"
							key={result.id}
							className="w-full text-left px-3 py-2 hover:bg-accent border-b border-border/50 transition-colors"
							onClick={() => handleResultClick(result.id)}
						>
							<div className="flex items-center gap-1.5">
								<FileIcon className="size-3.5 text-muted-foreground flex-shrink-0" />
								<span className="text-sm font-medium truncate">{result.title}</span>
							</div>
							{folder && (
								<div className="flex items-center gap-1 mt-0.5 ml-5">
									<FolderIcon className="size-3 text-muted-foreground" />
									<span className="text-[10px] text-muted-foreground truncate">{folder}</span>
								</div>
							)}
							{result.snippet && (
								<p className="mt-1 ml-5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
									{highlightSnippet(result.snippet, localQuery)}
								</p>
							)}
						</Button>
					)
				})}
			</div>
		</div>
	)
}
