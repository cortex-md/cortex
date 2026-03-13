import { Tabs, TabsList, TabsTrigger } from "@cortex/ui"

export interface TabItem {
	id: string
	title: string
	isPinned: boolean
	isDirty: boolean
}

interface Props {
	tabs: TabItem[]
	activeTabId: string | null
	onActivate: (tabId: string) => void
	onClose: (tabId: string) => void
	onPin?: (tabId: string) => void
	onContextMenu?: (tabId: string, event: React.MouseEvent) => void
}

export function TabBar({ tabs, activeTabId, onActivate, onClose, onPin, onContextMenu }: Props) {
	if (tabs.length === 0) return null

	const activeTab = tabs.find((t) => t.id === activeTabId)

	return (
		<Tabs
			value={activeTab?.title}
			onValueChange={(value) => {
				const tab = tabs.find((t) => t.title === value)
				if (tab) onActivate(tab.id)
			}}
		>
			<TabsList className="tab-bar">
				{tabs.map((tab) => (
					<TabsTrigger
						value={tab.title}
						key={tab.id}
						role="tab"
						tabIndex={tab.id === activeTabId ? 0 : -1}
						aria-selected={tab.id === activeTabId}
						className={tab.isPinned ? "tab-pinned" : ""}
						onClick={() => onActivate(tab.id)}
						onKeyDown={(e) => e.key === "Enter" && onActivate(tab.id)}
						onContextMenu={(e) => onContextMenu?.(tab.id, e)}
					>
						<span className="tab-title">{tab.title}</span>
						{tab.isDirty && <span className="tab-dirty-dot" aria-hidden="true" />}
					</TabsTrigger>
				))}
			</TabsList>
		</Tabs>
	)
}
