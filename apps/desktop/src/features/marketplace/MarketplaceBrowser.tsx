import {
	isEntryInstalled,
	type MarketplaceSortOrder,
	type MarketplaceTab,
	useMarketplaceStore,
} from "@cortex/marketplace"
import {
	Alert,
	AlertDescription,
	Button,
	Empty,
	EmptyDescription,
	EmptyMedia,
	Input,
	NativeSelect,
	NativeSelectOption,
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
		filterInstalled,
		sortOrder,
		registryError,
		availableUpdates,
		updatesChecking,
		releaseDates,
		releaseDatesLoading,
	} = useMarketplaceStore()
	const setSearchQuery = useMarketplaceStore((s) => s.setSearchQuery)
	const setFilterInstalled = useMarketplaceStore((s) => s.setFilterInstalled)
	const setSortOrder = useMarketplaceStore((s) => s.setSortOrder)
	const selectEntry = useMarketplaceStore((s) => s.selectEntry)
	const loadReadme = useMarketplaceStore((s) => s.loadReadme)

	const allEntries = tab === "plugins" ? pluginEntries : themeEntries
	const isLoading = allEntries.length === 0 && !registryError

	const filteredEntries = useMemo(() => {
		let entries = allEntries

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase()
			entries = entries.filter(
				(e) =>
					e.name.toLowerCase().includes(query) ||
					e.author.toLowerCase().includes(query) ||
					e.description.toLowerCase().includes(query),
			)
		}

		if (filterInstalled) {
			entries = entries.filter((e) => isEntryInstalled(e.id, tab))
		}

		if (sortOrder !== "default") {
			entries = [...entries].sort((a, b) => {
				const dateA = releaseDates[a.id] ? new Date(releaseDates[a.id]).getTime() : 0
				const dateB = releaseDates[b.id] ? new Date(releaseDates[b.id]).getTime() : 0
				return sortOrder === "newest" ? dateB - dateA : dateA - dateB
			})
		}

		return entries
	}, [allEntries, searchQuery, filterInstalled, sortOrder, tab, releaseDates])

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
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="flex shrink-0 flex-col gap-3 border-b border-border p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
					<div className="relative min-w-0 flex-1">
						<PackageSearch
							size={14}
							className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted"
						/>
						<Input
							placeholder={`Search ${tab}…`}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="h-9 pl-8 text-sm"
						/>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
						<Button
							variant={filterInstalled ? "secondary" : "ghost"}
							size="sm"
							className="h-8 px-2.5 text-xs"
							onClick={() => setFilterInstalled(!filterInstalled)}
						>
							Installed
						</Button>
						<NativeSelect
							size="sm"
							value={sortOrder}
							className="text-xs"
							onChange={(e) => setSortOrder(e.target.value as MarketplaceSortOrder)}
						>
							<NativeSelectOption value="default">Default</NativeSelectOption>
							<NativeSelectOption value="newest">Newest first</NativeSelectOption>
							<NativeSelectOption value="oldest">Oldest first</NativeSelectOption>
						</NativeSelect>
					</div>
				</div>
				<div className="text-[11px] text-text-muted">
					{filteredEntries.length === allEntries.length
						? `${allEntries.length} ${tab} available`
						: `${filteredEntries.length} of ${allEntries.length} ${tab}`}
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<div className="p-4">
					{registryError && (
						<Alert variant="destructive" className="mb-3">
							<TriangleAlert size={14} />
							<AlertDescription>Failed to load registry. Check your connection.</AlertDescription>
						</Alert>
					)}

					{updateCount > 0 && (
						<Alert className="mb-3 animate-in fade-in-0 slide-in-from-top-2 py-2 duration-300">
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
						<div className="mb-3 flex items-center gap-2 px-1 py-2 animate-in fade-in-0 duration-300">
							<Spinner className="size-3 text-text-muted" />
							<span className="text-[10px] text-text-muted">Checking for updates…</span>
						</div>
					)}

					{releaseDatesLoading && sortOrder !== "default" && !isLoading && (
						<div className="mb-3 flex items-center gap-2 px-1 py-2 animate-in fade-in-0 duration-300">
							<Spinner className="size-3 text-text-muted" />
							<span className="text-[10px] text-text-muted">Loading release dates…</span>
						</div>
					)}

					{!isLoading && filteredEntries.length === 0 && !registryError && (
						<Empty className="py-8 border-none">
							<EmptyMedia variant="icon">
								<PackageSearch />
							</EmptyMedia>
							<EmptyDescription>No {tab} found matching your search.</EmptyDescription>
						</Empty>
					)}

					{isLoading && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{["sk-1", "sk-2", "sk-3", "sk-4", "sk-5", "sk-6"].map((key) => (
								<div key={key} className="flex min-h-[150px] flex-col rounded-lg p-4">
									<div className="flex gap-3">
										<Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
										<div className="flex flex-1 flex-col gap-1.5">
											<Skeleton className="h-3 w-3/4" />
											<Skeleton className="h-2.5 w-1/2" />
										</div>
									</div>
									<div className="mt-4 flex flex-col gap-2">
										<Skeleton className="h-2.5 w-full" />
										<Skeleton className="h-2.5 w-5/6" />
										<Skeleton className="h-2.5 w-2/3" />
									</div>
								</div>
							))}
						</div>
					)}

					{filteredEntries.length > 0 && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
							{filteredEntries.map((entry) => (
								<MarketplaceCard
									key={entry.id}
									entry={entry}
									isInstalled={isEntryInstalled(entry.id, tab)}
									onClick={() => handleSelect(entry.id)}
								/>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	)
}
