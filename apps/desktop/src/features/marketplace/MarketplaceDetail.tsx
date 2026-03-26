import { ReadingView } from "@cortex/editor"
import {
	isEntryInstalled,
	isVersionCompatible,
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
	ScrollArea,
	Separator,
	Skeleton,
	Spinner,
} from "@cortex/ui"
import { ArrowUp, Download, Package, Trash2, TriangleAlert } from "lucide-react"
import { useEffect } from "react"

interface MarketplaceDetailProps {
	tab: MarketplaceTab
}

export function MarketplaceDetail({ tab }: MarketplaceDetailProps) {
	const {
		selectedEntryId,
		pluginEntries,
		themeEntries,
		loadingEntryId,
		readmeCache,
		readmeLoading,
		appVersion,
		minVersionCache,
		availableUpdates,
	} = useMarketplaceStore()
	const installEntry = useMarketplaceStore((s) => s.installEntry)
	const uninstallEntry = useMarketplaceStore((s) => s.uninstallEntry)
	const loadReadme = useMarketplaceStore((s) => s.loadReadme)

	const allEntries = tab === "plugins" ? pluginEntries : themeEntries
	const entry = allEntries.find((e) => e.id === selectedEntryId)
	const isInstalled = entry ? isEntryInstalled(entry.id, tab) : false
	const isLoading = loadingEntryId === entry?.id
	const readme = entry ? readmeCache[entry.id] : undefined

	const minVersion = entry ? minVersionCache[entry.id] : undefined
	const hasCompatibilityWarning =
		Boolean(minVersion) && Boolean(appVersion) && !isVersionCompatible(appVersion!, minVersion!)
	const latestVersion = entry ? availableUpdates[entry.id] : undefined
	const hasUpdate = isInstalled && Boolean(latestVersion)

	useEffect(() => {
		if (entry && readme === undefined) loadReadme(entry)
	}, [entry, readme, loadReadme])

	if (!entry) {
		return (
			<Empty className="h-full border-none">
				<EmptyMedia variant="icon">
					<Package />
				</EmptyMedia>
				<EmptyDescription>
					Select a {tab === "plugins" ? "plugin" : "theme"} to see details
				</EmptyDescription>
			</Empty>
		)
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="p-5 flex gap-4 shrink-0">
				<div className="w-14 h-14 rounded-xl bg-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden">
					{entry.coverImageUrl ? (
						<img
							src={entry.coverImageUrl}
							alt={entry.name}
							className="w-full h-full object-cover rounded-xl"
						/>
					) : (
						<Package size={24} className="text-text-muted" />
					)}
				</div>
				<div className="flex flex-col gap-1 min-w-0 flex-1">
					<h2 className="text-sm font-semibold">{entry.name}</h2>
					{entry.authorUrl ? (
						<a
							href={entry.authorUrl}
							target="_blank"
							rel="noreferrer"
							className="text-xs text-text-muted hover:text-text-primary hover:underline w-fit"
							onClick={(e) => e.stopPropagation()}
						>
							by {entry.author}
						</a>
					) : (
						<p className="text-xs text-text-muted">by {entry.author}</p>
					)}
					<p className="text-xs text-text-muted">{entry.description}</p>
				</div>
				<div className="shrink-0 flex flex-col gap-1.5 items-end">
					{isInstalled && hasUpdate ? (
						<>
							<Button
								variant="default"
								size="sm"
								onClick={() => installEntry(entry)}
								disabled={isLoading}
								className="gap-1.5"
							>
								{isLoading ? <Spinner className="size-3" /> : <ArrowUp size={13} />}
								Update to {latestVersion}
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => uninstallEntry(entry)}
								disabled={isLoading}
								className="gap-1.5 text-text-muted hover:text-destructive"
							>
								<Trash2 size={13} />
								Uninstall
							</Button>
						</>
					) : isInstalled ? (
						<Button
							variant="destructive"
							size="sm"
							onClick={() => uninstallEntry(entry)}
							disabled={isLoading}
							className="gap-1.5"
						>
							{isLoading ? <Spinner className="size-3" /> : <Trash2 size={13} />}
							Uninstall
						</Button>
					) : (
						<Button
							variant="default"
							size="sm"
							onClick={() => installEntry(entry)}
							disabled={isLoading}
							className="gap-1.5"
						>
							{isLoading ? <Spinner className="size-3" /> : <Download size={13} />}
							Install
						</Button>
					)}
				</div>
			</div>

			{hasCompatibilityWarning && (
				<div className="px-5 pb-3 animate-in fade-in-0 duration-300">
					<Alert variant="destructive">
						<TriangleAlert size={14} />
						<AlertDescription>
							This {tab === "plugins" ? "plugin" : "theme"} requires Cortex v{minVersion} or later.
							You are running v{appVersion}. It may not work correctly.
						</AlertDescription>
					</Alert>
				</div>
			)}

			<Separator />

			<ScrollArea className="flex-1">
				{readmeLoading && readme === undefined ? (
					<div className="p-5 flex flex-col gap-3">
						<Skeleton className="h-4 w-2/3" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-4/5" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-3/4" />
					</div>
				) : readme ? (
					<div className="p-5">
						<ReadingView content={readme} />
					</div>
				) : (
					<Empty className="py-8 border-none">
						<EmptyDescription>No README available.</EmptyDescription>
					</Empty>
				)}
			</ScrollArea>
		</div>
	)
}
