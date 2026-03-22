import type { RegistryEntry } from "@cortex/marketplace"
import { Badge } from "@cortex/ui"
import { Package } from "lucide-react"

interface MarketplaceCardProps {
	entry: RegistryEntry
	isSelected: boolean
	isInstalled: boolean
	onClick: () => void
}

export function MarketplaceCard({ entry, isSelected, isInstalled, onClick }: MarketplaceCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`w-full text-left flex gap-3 px-3 py-3 rounded-lg transition-colors cursor-pointer hover:bg-bg-secondary ${
				isSelected ? "bg-bg-secondary" : ""
			}`}
		>
			<div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0 overflow-hidden">
				{entry.coverImageUrl ? (
					<img
						src={entry.coverImageUrl}
						alt={entry.name}
						className="w-full h-full object-cover rounded-lg"
					/>
				) : (
					<Package size={18} className="text-text-muted" />
				)}
			</div>
			<div className="flex flex-col min-w-0 flex-1 gap-0.5">
				<div className="flex items-center gap-2 flex-wrap">
					<span className="text-xs font-semibold truncate">{entry.name}</span>
					{isInstalled && (
						<Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
							Installed
						</Badge>
					)}
				</div>
				<span className="text-[10px] text-text-muted">by {entry.author}</span>
				<p className="text-[10px] text-text-muted line-clamp-2 leading-relaxed">
					{entry.description}
				</p>
			</div>
		</button>
	)
}
