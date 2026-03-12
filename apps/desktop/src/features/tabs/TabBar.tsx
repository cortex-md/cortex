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

	return (
    <Tabs>
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            value={tab.title}
            key={tab.id}
            role="tab"
            tabIndex={tab.id === activeTabId ? 0 : -1}
            aria-selected={tab.id === activeTabId}
            className={`rounded-lg ${tab.id === activeTabId ? "border-b-2 border-b-accent" : ""} ${tab.isPinned ? "tab-pinned" : ""}`}
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
    //    <div className="tab-bar" role="tablist">
    //    <div
				//  	key={tab.id}
				//  	role="tab"
				//  	tabIndex={tab.id === activeTabId ? 0 : -1}
				//  	aria-selected={tab.id === activeTabId}
				//  	className={`tab ${tab.id === activeTabId ? "tab-active" : ""} ${tab.isPinned ? "tab-pinned" : ""}`}
				//  	onClick={() => onActivate(tab.id)}
				//  	onKeyDown={(e) => e.key === "Enter" && onActivate(tab.id)}
				//  	onContextMenu={(e) => onContextMenu?.(tab.id, e)}
				//  >
				//  	<span className="tab-title">{tab.title}</span>
				//  	{tab.isDirty && <span className="tab-dirty-dot" aria-hidden="true" />}
				//  	{!tab.isPinned && (
				//  		<button
				//  			type="button"
				//  			className="tab-close"
				//  			onClick={(e) => {
				//  				e.stopPropagation()
				//  				onClose(tab.id)
				//  			}}
				//  			onDoubleClick={(e) => {
				//  				e.stopPropagation()
				//  				onPin?.(tab.id)
				//  			}}
				//  			aria-label={`Close ${tab.title}`}
				//  		>
				//  			<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
				//  				<path
				//  					d="M1 1L7 7M7 1L1 7"
				//  					stroke="currentColor"
				//  					strokeWidth="1.5"
				//  					strokeLinecap="round"
				//  				/>
				//  			</svg>
				//  		</button>
				//  	)}
				//  </div>
			 // </div>
	)
}
