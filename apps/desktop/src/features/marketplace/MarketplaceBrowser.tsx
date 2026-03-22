import { isEntryInstalled, type MarketplaceTab, useMarketplaceStore } from "@cortex/marketplace"
import { Input, Skeleton } from "@cortex/ui"
import { Search } from "lucide-react"
import { useMemo } from "react"
import { MarketplaceCard } from "./MarketplaceCard"

interface MarketplaceBrowserProps {
	tab: MarketplaceTab
}

export function MarketplaceBrowser({ tab }: MarketplaceBrowserProps) {
	const { pluginEntries, themeEntries, searchQuery, selectedEntryId, registryError } =
		useMarketplaceStore()
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

	const handleSelect = (id: string) => {
		selectEntry(id)
		const entry = allEntries.find((e) => e.id === id)
		if (entry) loadReadme(entry)
	}

	return (
		<div className="flex flex-col h-full">
			<div className="p-3 border-b border-border">
				<div className="relative">
					<Search
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

			<div className="flex-1 overflow-y-auto p-2">
				{registryError && (
					<p className="text-xs text-red-500 px-2 py-4 text-center">
						Failed to load registry. Check your connection.
					</p>
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
					<p className="text-xs text-text-muted px-2 py-8 text-center">
						No {tab} found matching your search.
					</p>
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

			<div className="px-3 py-2 border-t border-border">
				<span className="text-[10px] text-text-muted">
					{filteredEntries.length} {tab} available
				</span>
			</div>
		</div>
	)
}
