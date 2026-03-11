import { useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import { Button, Input } from "@cortex/ui"
import { FileIcon, FolderIcon, SearchIcon } from "lucide-react"
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
	const { query, results, setQuery, indexing, documentCount } = useSearchStore()
	const { openTab } = useWorkspaceStore()
	const vault = useVaultStore((s) => s.vault)
	const inputRef = useRef<HTMLInputElement>(null)
	const [localQuery, setLocalQuery] = useState(query)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const handleQueryChange = useCallback(
		(value: string) => {
			setLocalQuery(value)
			if (debounceRef.current) clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				setQuery(value)
			}, 150)
		},
		[setQuery],
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
				<div className="mt-1.5 text-[10px] text-muted-foreground">
					{indexing
						? "Indexing..."
						: query
							? `${results.length} result${results.length !== 1 ? "s" : ""}`
							: `${documentCount} notes indexed`}
				</div>
			</div>

			<div className="flex-1 overflow-y-auto">
				{results.length === 0 && query && !indexing && (
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
									{highlightSnippet(result.snippet, query)}
								</p>
							)}
						</Button>
					)
				})}
			</div>
		</div>
	)
}
