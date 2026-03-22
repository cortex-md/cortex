import { isEntryInstalled, type MarketplaceTab, useMarketplaceStore } from "@cortex/marketplace"
import {
	Alert,
	AlertDescription,
	Empty,
	EmptyDescription,
	EmptyMedia,
	Input,
	ScrollArea,
	Skeleton,
	Spinner,
} from "@cortex/ui"
import { ArrowUp, PackageSearch, TriangleAlert } from "lucide-react"
import { useMemo } from "react"
import { MarketplaceCard } from "./MarketplaceCard"

interface MarketplaceBrowserProps {
	tab: MarketplaceTab
}

export function MarketplaceBrowser({ tab }: MarketplaceBrowserProps) {
	const {
		pluginEntries,
		themeEntries,
		searchQuery,
		selectedEntryId,
		registryError,
		availableUpdates,
		updatesChecking,
	} = useMarketplaceStore()
	const setSearchQuery = useMarketplaceStore((s) => s.setSearchQuery)
	const selectEntry = useMarketplaceStore((s) => s.selectEntry)
	const loadReadme = useMarketplaceStore((s) => s.loadReadme)

	const allEntries = tab === "plugins" ? pluginEntries : themeEntries
	const isLoading = allEntries.length === 0 && !registryError

	const filteredEntries = useMemo(() => {
		if (!searchQuery.trim()) return allEntries
		const query = searchQuery.toLowerCase()
		return allEntries.filter(
			(e) =>
				e.name.toLowerCase().includes(query) ||
				e.author.toLowerCase().includes(query) ||
				e.description.toLowerCase().includes(query),
		)
	}, [allEntries, searchQuery])

	const updateCount = useMemo(
		() => allEntries.filter((e) => isEntryInstalled(e.id, tab) && availableUpdates[e.id]).length,
		[allEntries, tab, availableUpdates],
	)

	const handleSelect = (id: string) => {
		selectEntry(id)
		const entry = allEntries.find((e) => e.id === id)
		if (entry) loadReadme(entry)
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b border-border shrink-0">
				<div className="relative">
					<PackageSearch
						size={14}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
					/>
					<Input
						placeholder={`Search ${tab}…`}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-8 h-8 text-xs"
					/>
				</div>
			</div>

			<ScrollArea className="flex-1">
				<div className="p-2">
					{registryError && (
						<Alert variant="destructive" className="mx-1 my-2">
							<TriangleAlert size={14} />
							<AlertDescription>Failed to load registry. Check your connection.</AlertDescription>
						</Alert>
					)}

					{updateCount > 0 && (
						<Alert className="mx-1 my-2 py-2 animate-in fade-in-0 slide-in-from-top-2 duration-300">
							<ArrowUp size={14} />
							<AlertDescription className="flex items-center justify-between">
								<span>
									{updateCount} update{updateCount > 1 ? "s" : ""} available
								</span>
								{updatesChecking && <Spinner className="size-3" />}
							</AlertDescription>
						</Alert>
					)}

					{updatesChecking && updateCount === 0 && !isLoading && (
						<div className="flex items-center gap-2 px-3 py-2 animate-in fade-in-0 duration-300">
							<Spinner className="size-3 text-text-muted" />
							<span className="text-[10px] text-text-muted">Checking for updates…</span>
						</div>
					)}

					{isLoading &&
						["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((key) => (
							<div key={key} className="flex gap-3 px-3 py-3">
								<Skeleton className="w-10 h-10 rounded-lg shrink-0" />
								<div className="flex flex-col gap-1.5 flex-1">
									<Skeleton className="h-3 w-3/4" />
									<Skeleton className="h-2.5 w-1/2" />
									<Skeleton className="h-2.5 w-full" />
								</div>
							</div>
						))}

					{!isLoading && filteredEntries.length === 0 && !registryError && (
						<Empty className="py-8 border-none">
							<EmptyMedia variant="icon">
								<PackageSearch />
							</EmptyMedia>
							<EmptyDescription>No {tab} found matching your search.</EmptyDescription>
						</Empty>
					)}

					{filteredEntries.map((entry) => (
						<MarketplaceCard
							key={entry.id}
							entry={entry}
							isSelected={selectedEntryId === entry.id}
							isInstalled={isEntryInstalled(entry.id, tab)}
							onClick={() => handleSelect(entry.id)}
						/>
					))}
				</div>
			</ScrollArea>

			<div className="px-3 py-2 border-t border-border shrink-0">
				<span className="text-[10px] text-text-muted">
					{filteredEntries.length} {tab} available
				</span>
			</div>
		</div>
	)
}
