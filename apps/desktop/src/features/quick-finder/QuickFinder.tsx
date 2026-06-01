import type { OpenTabOptions } from "@cortex/core"
import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@cortex/ui"
import { Plus } from "lucide-react"
import type { KeyboardEvent } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"

interface QuickFinderOpenItem {
	type: "recent" | "search"
	value: string
	title: string
	folder: string
	filePath: string
}

interface QuickFinderCreateItem {
	type: "create"
	value: string
	title: string
	query: string
}

type QuickFinderItem = QuickFinderOpenItem | QuickFinderCreateItem

function titleFromPath(filePath: string): string {
	const name = filePath.split("/").pop() ?? filePath
	return name.endsWith(".md") ? name.slice(0, -3) : name
}

function folderFromPath(filePath: string, vaultPath: string): string {
	const relativePath = filePath.startsWith(vaultPath) ? filePath.slice(vaultPath.length) : filePath
	const folderParts = relativePath.split("/").filter(Boolean)
	folderParts.pop()
	return folderParts.join("/")
}

function normalizeTitle(value: string): string {
	return value.trim().toLowerCase()
}

function buildOpenOptions(
	activePaneId: string,
	newTab: boolean,
	split: boolean,
): OpenTabOptions | undefined {
	if (split) return { paneId: activePaneId, split: "horizontal" }
	if (newTab) return { paneId: activePaneId }
	return undefined
}

export function QuickFinder() {
	const { quickFinderOpen, toggleQuickFinder } = useUIStore()
	const { vault, createFile } = useVaultStore()
	const { openTab, panes, recentlyClosed, activePaneId } = useWorkspaceStore()
	const { searchTitles } = useSearchStore()

	const [query, setQuery] = useState("")
	const [selectedValue, setSelectedValue] = useState("")

	const trimmedQuery = query.trim()

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
		if (!trimmedQuery) return []
		return searchTitles(trimmedQuery).slice(0, 20)
	}, [trimmedQuery, searchTitles])

	const openItems = useMemo<QuickFinderOpenItem[]>(() => {
		if (!vault) return []

		if (!trimmedQuery) {
			return recentFilePaths.map((filePath) => ({
				type: "recent",
				value: `recent:${filePath}`,
				title: titleFromPath(filePath),
				folder: folderFromPath(filePath, vault.path),
				filePath,
			}))
		}

		return searchResults.map((result) => ({
			type: "search",
			value: `search:${result.id}`,
			title: result.title,
			folder: result.folder,
			filePath: `${vault.path}/${result.id}`,
		}))
	}, [recentFilePaths, searchResults, trimmedQuery, vault])

	const canCreateNote = useMemo(() => {
		const normalizedQuery = normalizeTitle(trimmedQuery)
		if (!normalizedQuery) return false

		return !openItems.some((item) => {
			const normalizedTitle = normalizeTitle(item.title)
			const normalizedFileName = normalizeTitle(titleFromPath(item.filePath))
			return normalizedTitle === normalizedQuery || normalizedFileName === normalizedQuery
		})
	}, [openItems, trimmedQuery])

	const displayItems = useMemo<QuickFinderItem[]>(() => {
		if (!canCreateNote) return openItems
		return [
			...openItems,
			{
				type: "create",
				value: `create:${trimmedQuery}`,
				title: `Create "${trimmedQuery}"`,
				query: trimmedQuery,
			},
		]
	}, [canCreateNote, openItems, trimmedQuery])

	useEffect(() => {
		if (quickFinderOpen) {
			setQuery("")
		}
	}, [quickFinderOpen])

	useEffect(() => {
		setSelectedValue(displayItems[0]?.value ?? "")
	}, [displayItems])

	const handleCreateNote = useCallback(
		async (noteTitle: string) => {
			if (!vault || !noteTitle.trim()) return
			const filePath = await createFile(vault.path, noteTitle.trim())
			openTab(filePath)
			toggleQuickFinder()
		},
		[vault, createFile, openTab, toggleQuickFinder],
	)

	const handleOpenItem = useCallback(
		(item: QuickFinderOpenItem, newTab = false, split = false) => {
			openTab(item.filePath, buildOpenOptions(activePaneId, newTab, split))
			toggleQuickFinder()
		},
		[activePaneId, openTab, toggleQuickFinder],
	)

	const handleSelectItem = useCallback(
		(item: QuickFinderItem, newTab = false, split = false) => {
			if (item.type === "create") {
				void handleCreateNote(item.query)
				return
			}
			handleOpenItem(item, newTab, split)
		},
		[handleCreateNote, handleOpenItem],
	)

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (event.key !== "Enter") return

			const newTab = event.metaKey || event.ctrlKey
			if (event.shiftKey && !newTab) {
				event.preventDefault()
				void handleCreateNote(trimmedQuery)
				return
			}

			const selectedItem =
				displayItems.find((item) => item.value === selectedValue) ?? displayItems[0]
			if (!selectedItem) return

			event.preventDefault()
			handleSelectItem(selectedItem, newTab, newTab && event.shiftKey)
		},
		[displayItems, handleCreateNote, handleSelectItem, selectedValue, trimmedQuery],
	)

	if (!vault) return null

	return (
		<CommandDialog
			open={quickFinderOpen}
			onOpenChange={(open) => {
				if (!open) toggleQuickFinder()
			}}
			title="Quick Finder"
			description="Search and open files in your vault"
			showCloseButton={false}
			className="sm:max-w-[720px]"
			commandProps={{
				loop: true,
				shouldFilter: false,
				value: selectedValue,
				onValueChange: setSelectedValue,
				onKeyDown: handleKeyDown,
			}}
		>
			<CommandInput
				autoFocus
				placeholder="Search notes..."
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList className="max-h-[min(430px,62vh)]">
				{displayItems.length === 0 ? (
					<CommandEmpty>No results found</CommandEmpty>
				) : (
					<CommandGroup heading={trimmedQuery ? "Notes" : "Recent"}>
						{displayItems.map((item) => {
							if (item.type === "create") {
								return (
									<CommandItem
										key={item.value}
										value={item.value}
										onSelect={() => handleSelectItem(item)}
									>
										<Plus className="size-4 text-brand" />
										<span className="min-w-0 flex-1 truncate">{item.title}</span>
										<CommandShortcut className="tracking-normal">Shift Enter</CommandShortcut>
									</CommandItem>
								)
							}

							return (
								<CommandItem
									key={item.value}
									value={item.value}
									onSelect={() => handleSelectItem(item)}
								>
									<span className="min-w-0 flex-1 truncate">{item.title}</span>
									{item.folder && (
										<CommandShortcut className="max-w-[220px] truncate tracking-normal">
											{item.folder}
										</CommandShortcut>
									)}
								</CommandItem>
							)
						})}
					</CommandGroup>
				)}
			</CommandList>
		</CommandDialog>
	)
}
