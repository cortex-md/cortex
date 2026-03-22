import { type MarketplaceTab, useMarketplaceStore } from "@cortex/marketplace"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	Tabs,
	TabsList,
	TabsTrigger,
} from "@cortex/ui"
import { RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { MarketplaceBrowser } from "./MarketplaceBrowser"
import { MarketplaceDetail } from "./MarketplaceDetail"

interface MarketplaceModalProps {
	open: boolean
	initialTab: MarketplaceTab
	onOpenChange: (open: boolean) => void
}

export function MarketplaceModal({ open, initialTab, onOpenChange }: MarketplaceModalProps) {
	const activeTab = useMarketplaceStore((s) => s.activeTab)
	const setActiveTab = useMarketplaceStore((s) => s.setActiveTab)
	const refreshRegistry = useMarketplaceStore((s) => s.refreshRegistry)
	const loadRegistry = useMarketplaceStore((s) => s.loadRegistry)

	useEffect(() => {
		if (open) {
			setActiveTab(initialTab)
			loadRegistry()
		}
	}, [open, initialTab, setActiveTab, loadRegistry])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 max-w-[1000px] h-[680px] flex flex-col">
				<DialogTitle className="sr-only">Marketplace</DialogTitle>
				<DialogDescription className="sr-only">
					Browse and install community plugins and themes.
				</DialogDescription>

				<div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border shrink-0">
					<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MarketplaceTab)}>
						<TabsList>
							<TabsTrigger value="plugins">Plugins</TabsTrigger>
							<TabsTrigger value="themes">Themes</TabsTrigger>
						</TabsList>
					</Tabs>
					<button
						type="button"
						onClick={refreshRegistry}
						className="text-text-muted hover:text-text-primary transition-colors p-1 rounded"
						title="Refresh registry"
					>
						<RefreshCw size={14} />
					</button>
				</div>

				<div className="flex flex-1 overflow-hidden">
					<div className="w-[340px] shrink-0 border-r border-border overflow-hidden">
						<MarketplaceBrowser tab={activeTab} />
					</div>
					<div className="flex-1 overflow-hidden">
						<MarketplaceDetail tab={activeTab} />
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
