import type { RegistryEntry } from "@cortex/marketplace"
import { useMarketplaceStore } from "@cortex/marketplace"
import { Badge } from "@cortex/ui"
import { ArrowUp, Package } from "lucide-react"

interface MarketplaceCardProps {
	entry: RegistryEntry
	isInstalled: boolean
	onClick: () => void
}

export function MarketplaceCard({ entry, isInstalled, onClick }: MarketplaceCardProps) {
	const availableUpdates = useMarketplaceStore((s) => s.availableUpdates)
	const hasUpdate = isInstalled && Boolean(availableUpdates[entry.id])

	return (
		<button
			type="button"
			onClick={onClick}
			className="flex h-full min-h-[150px] w-full flex-col rounded-lg border border-border bg-bg-primary p-4 text-left transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
		>
			<div className="flex min-w-0 items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg-tertiary">
					{entry.coverImageUrl ? (
						<img
							src={entry.coverImageUrl}
							alt={entry.name}
							className="h-full w-full rounded-lg object-cover"
						/>
					) : (
						<Package size={20} className="text-text-muted" />
					)}
				</div>
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex min-w-0 flex-wrap items-center gap-2">
						<span className="truncate text-sm font-semibold">{entry.name}</span>
						{isInstalled && !hasUpdate && (
							<Badge variant="outline" className="h-4 shrink-0 px-1.5 text-[10px]">
								Installed
							</Badge>
						)}
						{hasUpdate && (
							<Badge
								variant="secondary"
								className="h-4 shrink-0 gap-0.5 px-1.5 text-[10px] animate-in fade-in-0 duration-300"
							>
								<ArrowUp size={8} />
								Update
							</Badge>
						)}
					</div>
					<span className="truncate text-[11px] text-text-muted">Author name: {entry.author}</span>
				</div>
			</div>
			<div className="mt-3 flex flex-col gap-1 text-[10px] text-text-muted">
				{entry.authorUrl && <span className="truncate">Author link: {entry.authorUrl}</span>}
				{entry.repo && <span className="truncate">Repository link: {entry.repo}</span>}
			</div>
			<p className="mt-3 line-clamp-3 text-xs leading-relaxed text-text-muted">
				{entry.description}
			</p>
		</button>
	)
}
