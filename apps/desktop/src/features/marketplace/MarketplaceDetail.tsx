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
	Skeleton,
	Spinner,
} from "@cortex/ui"
import {
	ArrowLeft,
	ArrowUp,
	Download,
	ExternalLink,
	Package,
	Trash2,
	TriangleAlert,
} from "lucide-react"
import { useEffect, useLayoutEffect, useRef } from "react"

interface MarketplaceDetailProps {
	tab: MarketplaceTab
	onBack: () => void
}

function getExternalUrl(value: string) {
	if (value.startsWith("http://") || value.startsWith("https://")) return value
	return `https://${value}`
}

function getRepositoryUrl(value: string) {
	if (value.startsWith("http://") || value.startsWith("https://")) return value
	if (value.startsWith("github.com/")) return `https://${value}`
	return `https://github.com/${value}`
}

export function MarketplaceDetail({ tab, onBack }: MarketplaceDetailProps) {
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
		installError,
	} = useMarketplaceStore()
	const installEntry = useMarketplaceStore((s) => s.installEntry)
	const uninstallEntry = useMarketplaceStore((s) => s.uninstallEntry)
	const loadReadme = useMarketplaceStore((s) => s.loadReadme)
	const readmeScrollRef = useRef<HTMLDivElement>(null)

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
	const authorUrl = entry?.authorUrl ? getExternalUrl(entry.authorUrl) : null
	const repositoryUrl = entry?.repo ? getRepositoryUrl(entry.repo) : null
	const readmeScrollKey = entry?.id ?? ""

	useEffect(() => {
		if (entry && readme === undefined) loadReadme(entry)
	}, [entry, readme, loadReadme])

	useLayoutEffect(() => {
		if (!readmeScrollKey) return

		const viewport = readmeScrollRef.current?.querySelector<HTMLElement>(
			'[data-slot="scroll-area-viewport"]',
		)
		if (!viewport) return

		viewport.scrollTop = 0
		viewport.scrollLeft = 0
	}, [readmeScrollKey])

	if (!entry) {
		return (
			<div className="flex h-full flex-col overflow-hidden">
				<div className="shrink-0 border-b border-border px-4 py-3">
					<Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
						<ArrowLeft size={14} />
						Back to search
					</Button>
				</div>
				<Empty className="min-h-0 flex-1 border-none">
					<EmptyMedia variant="icon">
						<Package />
					</EmptyMedia>
					<EmptyDescription>
						Select a {tab === "plugins" ? "plugin" : "theme"} to see details
					</EmptyDescription>
				</Empty>
			</div>
		)
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			<div className="shrink-0 border-b border-border">
				<div className="px-4 pt-3">
					<Button variant="ghost" size="sm" className="gap-1.5" onClick={onBack}>
						<ArrowLeft size={14} />
						Back to search
					</Button>
				</div>
				<div className="flex flex-col gap-4 p-5 pt-3 sm:flex-row">
					<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-tertiary">
						{entry.coverImageUrl ? (
							<img
								src={entry.coverImageUrl}
								alt={entry.name}
								className="h-full w-full rounded-lg object-cover"
							/>
						) : (
							<Package size={24} className="text-text-muted" />
						)}
					</div>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<h2 className="text-sm font-semibold">{entry.name}</h2>
						<p className="text-xs text-text-muted">{entry.description}</p>
						<div className="mt-2 grid gap-1.5 text-xs text-text-muted sm:grid-cols-2">
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-[10px] font-medium uppercase text-text-muted">
									Author name
								</span>
								<span className="truncate text-text-primary">{entry.author}</span>
							</div>
							{authorUrl && (
								<a
									href={authorUrl}
									target="_blank"
									rel="noreferrer"
									className="flex min-w-0 flex-col gap-0.5 hover:text-text-primary"
								>
									<span className="text-[10px] font-medium uppercase text-text-muted">
										Author link
									</span>
									<span className="inline-flex min-w-0 items-center gap-1">
										<span className="truncate">{entry.authorUrl}</span>
										<ExternalLink size={11} />
									</span>
								</a>
							)}
							{repositoryUrl && (
								<a
									href={repositoryUrl}
									target="_blank"
									rel="noreferrer"
									className="flex min-w-0 flex-col gap-0.5 hover:text-text-primary"
								>
									<span className="text-[10px] font-medium uppercase text-text-muted">
										Repository link
									</span>
									<span className="inline-flex min-w-0 items-center gap-1">
										<span className="truncate">{entry.repo}</span>
										<ExternalLink size={11} />
									</span>
								</a>
							)}
						</div>
					</div>
					<div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
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
								This {tab === "plugins" ? "plugin" : "theme"} requires Cortex v{minVersion} or
								later. You are running v{appVersion}. It may not work correctly.
							</AlertDescription>
						</Alert>
					</div>
				)}

				{installError && (
					<div className="px-5 pb-3 animate-in fade-in-0 duration-300">
						<Alert variant="destructive">
							<TriangleAlert size={14} />
							<AlertDescription>{installError}</AlertDescription>
						</Alert>
					</div>
				)}
			</div>

			<div ref={readmeScrollRef} className="min-h-0 flex-1 overflow-hidden">
				<ScrollArea key={entry.id} className="h-full">
					{readmeLoading && readme === undefined ? (
						<div className="flex flex-col gap-3 p-5">
							<Skeleton className="h-4 w-2/3" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-4/5" />
							<Skeleton className="h-3 w-full" />
							<Skeleton className="h-3 w-3/4" />
						</div>
					) : readme ? (
						<div className="marketplace-readme">
							<ReadingView content={readme} />
						</div>
					) : (
						<Empty className="border-none py-8">
							<EmptyDescription>No README available.</EmptyDescription>
						</Empty>
					)}
				</ScrollArea>
			</div>
		</div>
	)
}
