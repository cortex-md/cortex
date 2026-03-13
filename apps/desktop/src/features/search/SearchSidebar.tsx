import { useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
	Input,
} from "@cortex/ui"
import { FileIcon, FilterIcon, FolderIcon, SearchIcon } from "lucide-react"
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

interface ParsedQuery {
	text: string
	tags: string[]
	paths: string[]
	files: string[]
}

function parseSearchQuery(raw: string): ParsedQuery {
	const result: ParsedQuery = { text: "", tags: [], paths: [], files: [] }
	const parts: string[] = []

	const regex = /(tag|path|file):(\S+)/gi
	let lastIndex = 0
	let match: RegExpExecArray | null = null

	match = regex.exec(raw)
	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(raw.slice(lastIndex, match.index))
		}
		const prefix = match[1].toLowerCase()
		const value = match[2]
		if (prefix === "tag") result.tags.push(value)
		else if (prefix === "path") result.paths.push(value)
		else if (prefix === "file") result.files.push(value)
		lastIndex = regex.lastIndex
		match = regex.exec(raw)
	}

	if (lastIndex < raw.length) {
		parts.push(raw.slice(lastIndex))
	}

	result.text = parts.join("").trim()
	return result
}

export function SearchSidebar() {
	const { query, results, search, setQuery, indexing, documentCount } = useSearchStore()
	const { openTab } = useWorkspaceStore()
	const vault = useVaultStore((s) => s.vault)
	const inputRef = useRef<HTMLInputElement>(null)
	const [localQuery, setLocalQuery] = useState(query)
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => {
		inputRef.current?.focus()
	}, [])

	const runSearch = useCallback(
		(rawQuery: string) => {
			const parsed = parseSearchQuery(rawQuery)

			if (!parsed.text && parsed.tags.length === 0 && parsed.files.length === 0) {
				setQuery("")
				return
			}

			const searchText = parsed.text || parsed.files.join(" ") || parsed.tags.join(" ") || " "

			search(searchText, {
				tags: parsed.tags.length > 0 ? parsed.tags : undefined,
				folder: parsed.paths.length > 0 ? parsed.paths[0] : undefined,
			})
		},
		[search, setQuery],
	)

	const handleQueryChange = useCallback(
		(value: string) => {
			setLocalQuery(value)
			if (debounceRef.current) clearTimeout(debounceRef.current)
			debounceRef.current = setTimeout(() => {
				runSearch(value)
			}, 150)
		},
		[runSearch],
	)

	const handleInsertFilter = useCallback(
		(prefix: string) => {
			const newQuery = `${localQuery} ${prefix}`.trimStart()
			setLocalQuery(newQuery)
			inputRef.current?.focus()
		},
		[localQuery],
	)

	const handleResultClick = useCallback(
		(id: string) => {
			if (!vault) return
			openTab(`${vault.path}/${id}`)
		},
		[vault, openTab],
	)

	const parsed = parseSearchQuery(localQuery)
	const hasFilters = parsed.tags.length > 0 || parsed.paths.length > 0 || parsed.files.length > 0

	return (
		<div className="flex flex-col h-full">
			<div className="px-3 py-2 border-b border-border">
				<div className="flex items-center gap-1">
					<div className="relative flex-1">
						<SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
						<Input
							ref={inputRef}
							type="text"
							value={localQuery}
							onChange={(e) => handleQueryChange(e.target.value)}
							placeholder="Search in vault..."
							className="w-full h-8 pl-8 pr-3 text-sm rounded-md border border-border focus:border-ring focus:outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								className="h-8 w-8 p-0 flex-shrink-0"
								title="Add filter"
							>
								<FilterIcon className="size-3.5" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel>
                Filter options
  						</DropdownMenuLabel>
						<DropdownMenuItem className="text-sm" onSelect={() => handleInsertFilter("tag:")}>
								<span>tag</span>
								<span className="ml-auto text-muted-foreground">tag:name</span>
							</DropdownMenuItem>
							<DropdownMenuItem className="text-sm" onSelect={() => handleInsertFilter("path:")}>
								<span>path</span>
								<span className="ml-auto text-muted-foreground">path:folder</span>
							</DropdownMenuItem>
							<DropdownMenuItem className="text-sm" onSelect={() => handleInsertFilter("file:")}>
								<span>file name</span>
								<span className="ml-auto text-muted-foreground">file:name</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				<div className="mt-1.5 flex items-center justify-between">
					<span className="text-[10px] text-muted-foreground">
							{results.length !== 0 && `${results.length} result${results.length !== 1 ? "s" : ""}`}
					</span>
					{hasFilters && (
						<span className="text-[10px] text-brand">
							{parsed.tags.map((t) => `tag:${t}`).join(" ")}
							{parsed.paths.map((p) => ` path:${p}`).join("")}
							{parsed.files.map((f) => ` file:${f}`).join("")}
						</span>
					)}
				</div>

				<p className="mt-1 text-[9px] text-muted-foreground/70">
					Use tag: path: or file: to filter results
				</p>
			</div>

			<div className="flex-1 overflow-y-auto">
				{results.length === 0 && localQuery.trim() && !indexing && (
					<div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
						No results found
					</div>
				)}
        <div className="px-1 pt-2 flex flex-col gap-1">
          {results.map((result) => {
					const folder = folderFromPath(result.id)
					return (
						<Button
  						size={"sm"}
  						variant={"ghost"}
							key={result.id}
							className="w-full text-left px-3 py-2 hover:bg-accent transition-colors"
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
									{highlightSnippet(result.snippet, parsed.text)}
								</p>
							)}
						</Button>
					)
				})}
				</div>
			</div>
		</div>
	)
}
