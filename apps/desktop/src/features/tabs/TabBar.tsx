import { Tabs, TabsList, TabsTrigger } from "@cortex/ui"
import { XIcon } from "lucide-react"

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

export function TabBar({ tabs, activeTabId, onActivate, onClose, onContextMenu }: Props) {
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
				{tabs.map((tab) => {
					const isActive = tab.id === activeTabId
					return (
						<TabsTrigger
							value={tab.title}
							key={tab.id}
							role="tab"
							tabIndex={isActive ? 0 : -1}
							aria-selected={isActive}
							className={`tab-trigger group/tab ${tab.isPinned ? "tab-pinned" : ""}`}
							onClick={() => onActivate(tab.id)}
							onKeyDown={(e) => e.key === "Enter" && onActivate(tab.id)}
							onContextMenu={(e) => onContextMenu?.(tab.id, e)}
						>
							<span className="tab-title truncate">{tab.title}</span>
							{tab.isDirty && <span className="tab-dirty-dot" aria-hidden="true" />}
							{!tab.isPinned && (
								<button
									type="button"
									className="tab-close-btn opacity-0 group-hover/tab:opacity-100 data-[active=true]:opacity-100 shrink-0 rounded p-0.5 hover:bg-bg-tertiary"
									data-active={isActive || undefined}
									onClick={(e) => {
										e.stopPropagation()
										onClose(tab.id)
									}}
									onPointerDown={(e) => e.stopPropagation()}
								>
									<XIcon size={12} />
								</button>
							)}
						</TabsTrigger>
					)
				})}
			</TabsList>
		</Tabs>
	)
}
