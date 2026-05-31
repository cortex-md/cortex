import { type MarketplaceTab, useMarketplaceStore } from "@cortex/marketplace"
import {
	Button,
	Tabs,
	TabsList,
	TabsTrigger,
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@cortex/ui"
import { RefreshCw } from "lucide-react"
import { useEffect } from "react"
import { MarketplaceBrowser } from "./MarketplaceBrowser"
import { MarketplaceDetail } from "./MarketplaceDetail"

interface MarketplaceSectionProps {
	initialTab: MarketplaceTab
}

export function MarketplaceSection({ initialTab }: MarketplaceSectionProps) {
	const activeTab = useMarketplaceStore((s) => s.activeTab)
	const selectedEntryId = useMarketplaceStore((s) => s.selectedEntryId)
	const setActiveTab = useMarketplaceStore((s) => s.setActiveTab)
	const selectEntry = useMarketplaceStore((s) => s.selectEntry)
	const refreshRegistry = useMarketplaceStore((s) => s.refreshRegistry)
	const loadRegistry = useMarketplaceStore((s) => s.loadRegistry)

	useEffect(() => {
		setActiveTab(initialTab)
		loadRegistry()
	}, [initialTab, setActiveTab, loadRegistry])

	return (
		<section className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="flex shrink-0 items-center justify-between px-4 py-3">
				<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MarketplaceTab)}>
					<TabsList>
						<TabsTrigger value="plugins">Plugins</TabsTrigger>
						<TabsTrigger value="themes">Themes</TabsTrigger>
					</TabsList>
				</Tabs>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								aria-label="Refresh marketplace"
								onClick={refreshRegistry}
							>
								<RefreshCw size={14} />
							</Button>
						</TooltipTrigger>
						<TooltipContent>Refresh registry</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>

			<div className="min-h-0 flex-1 overflow-hidden">
				{selectedEntryId ? (
					<MarketplaceDetail tab={activeTab} onBack={() => selectEntry(null)} />
				) : (
					<MarketplaceBrowser tab={activeTab} />
				)}
			</div>
		</section>
	)
}
