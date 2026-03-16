import type { OpenTabOptions } from "@cortex/core"
import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	Kbd,
} from "@cortex/ui"
import { Search, XIcon } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

export function QuickFinder() {
	const { quickFinderOpen, toggleQuickFinder } = useUIStore()
	const { vault, createFile } = useVaultStore()
	const { openTab, panes, recentlyClosed, splitPane } = useWorkspaceStore()
	const { searchTitles } = useSearchStore()

	const [query, setQuery] = useState("")
	const [selectedIndex, setSelectedIndex] = useState(0)
	const inputRef = useRef<HTMLInputElement>(null)
	const resultsRef = useRef<HTMLDivElement>(null)

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

	const searchResults = useMemo(() => {
		if (!query.trim()) return []
		return searchTitles(query.trim()).slice(0, 20)
	}, [query, searchTitles])

	const displayItems = useMemo(() => {
		const items: Array<{
			type: "recent" | "search"
			id: string
			title: string
			folder: string
			filePath: string
		}> = []

		if (!query.trim()) {
			for (const filePath of recentFilePaths) {
				const folderParts = filePath
					.replace(vault?.path ?? "", "")
					.split("/")
					.filter(Boolean)
				folderParts.pop()
				items.push({
					type: "recent",
					id: filePath,
					title: titleFromPath(filePath),
					folder: folderParts.join("/"),
					filePath,
				})
			}
		} else {
			for (const result of searchResults) {
				items.push({
					type: "search",
					id: result.id,
					title: result.title,
					folder: result.folder,
					filePath: `${vault?.path}/${result.id}`,
				})
			}
		}

		return items
	}, [query, recentFilePaths, searchResults, vault?.path])

	useEffect(() => {
		if (quickFinderOpen) {
			setQuery("")
			setSelectedIndex(0)
			setTimeout(() => inputRef.current?.focus(), 50)
		}
	}, [quickFinderOpen])

	// biome-ignore lint/correctness/useExhaustiveDependencies: resetting selection when query changes
	useEffect(() => {
		setSelectedIndex(0)
	}, [query])

	const handleCreateNote = useCallback(async () => {
		if (!vault || !query.trim()) return
		const filePath = await createFile(vault.path, query.trim())
		openTab(filePath)
		toggleQuickFinder()
	}, [vault, query, createFile, openTab, toggleQuickFinder])

	const handleSelect = useCallback(
		(filePath: string, newTab: boolean = false, split: boolean = false) => {
			if (split && vault) {
				splitPane(useWorkspaceStore.getState().activePaneId ?? "", "horizontal")
			}
			const opts: OpenTabOptions | undefined =
				newTab || split
					? { paneId: useWorkspaceStore.getState().activePaneId ?? undefined }
					: undefined
			openTab(filePath, opts)
			toggleQuickFinder()
		},
		[openTab, splitPane, toggleQuickFinder, vault],
	)

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "ArrowDown") {
				e.preventDefault()
				setSelectedIndex((i) => Math.min(i + 1, displayItems.length - 1))
			} else if (e.key === "ArrowUp") {
				e.preventDefault()
				setSelectedIndex((i) => Math.max(i - 1, 0))
			} else if (e.key === "Enter") {
				e.preventDefault()
				const item = displayItems[selectedIndex]
				if (item) {
					const newTab = e.metaKey || e.ctrlKey
					const split = e.metaKey && e.shiftKey
					handleSelect(item.filePath, newTab, split)
				}
			}
		},
		[displayItems, selectedIndex, handleSelect],
	)

	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" && e.shiftKey) {
				e.preventDefault()
				handleCreateNote()
			} else {
				handleKeyDown(e)
			}
		},
		[handleKeyDown, handleCreateNote],
	)

	const handleItemClick = useCallback(
		(filePath: string) => {
			handleSelect(filePath)
		},
		[handleSelect],
	)

	if (!vault) return null

	return (
		<Dialog open={quickFinderOpen} onOpenChange={() => toggleQuickFinder()}>
			<DialogContent
				className="p-2 max-h-[900px] w-[1000px] gap-0"
				showCloseButton={false}
				onKeyDown={handleInputKeyDown}
			>
				<DialogTitle className="sr-only">Quick Finder</DialogTitle>
				<DialogDescription className="sr-only">
					Search and open files in your vault
				</DialogDescription>

				<div className="flex items-center border-b border-border px-1 pb-2">
					<InputGroup className="w-full">
						<InputGroupInput
							ref={inputRef}
							placeholder="Search..."
							type="text"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="w-full flex-1 bg-transparent ring-0 text-sm outline-none placeholder:text-muted-foreground"
						/>
						<InputGroupAddon>
							<Search />
						</InputGroupAddon>
						<InputGroupAddon align="inline-end" onClick={() => toggleQuickFinder()}>
							<Kbd>
								<span>Esc</span>
							</Kbd>
						</InputGroupAddon>
					</InputGroup>
				</div>

				<div ref={resultsRef} className="overflow-y-auto max-h-[350px] py-1">
					{displayItems.length === 0 ? (
						<div className="px-3 py-8 text-center text-sm text-muted-foreground">
							No results found
						</div>
					) : (
						displayItems.map((item, index) => (
							<Button
								variant="ghost"
								key={`${item.type}-${item.id}`}
								type="button"
								onClick={() => handleItemClick(item.filePath)}
								className={`flex items-center justify-between w-full px-3 py-2 cursor-pointer text-left ${
									index === selectedIndex ? "bg-accent/10" : "hover:bg-muted"
								}`}
							>
								<div className="flex items-center gap-2 min-w-0">
									<span className="truncate text-sm">{item.title}</span>
								</div>
								{item.folder && (
									<span className="text-xs text-muted-foreground truncate ml-2">{item.folder}</span>
								)}
							</Button>
						))
					)}
				</div>

				<div className="flex items-center justify-between px-3 py-2 text-xs text-muted-foreground bg-muted/30">
					<div className="flex items-center gap-1">
						<Kbd className="px-1.5 py-0.5 text-[10px]">↑</Kbd>
						<Kbd className="px-1.5 py-0.5 text-[10px]">↓</Kbd>
						<span>to navigate</span>
					</div>
					<div className="flex items-center gap-1">
						<Kbd className="px-1.5 py-0.5 text-[10px]">Enter</Kbd>
						<span>open</span>
					</div>
					<div className="flex items-center gap-1">
						<Kbd className="px-1.5 py-0.5 text-[10px]">Shift+Enter</Kbd>
						<span>create</span>
					</div>
					<div className="flex items-center gap-1">
						<Kbd className="px-1.5 py-0.5 text-[10px]">⌘</Kbd>
						<Kbd className="px-1.5 py-0.5 text-[10px]">Enter</Kbd>
						<span>new tab</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
