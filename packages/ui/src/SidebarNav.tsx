import type { LucideIcon } from "lucide-react"
import { Button } from "./Button"

export interface NavItem {
	id: string
	icon: LucideIcon
	label: string
}

interface Props {
	items: NavItem[]
	bottomItems?: NavItem[]
	activeId: string | null
	onSelect: (id: string) => void
}

export function SidebarNav({ items, bottomItems, activeId, onSelect }: Props) {
	const renderItem = (item: NavItem) => {
		const Icon = item.icon
		return (
			<Button
				key={item.id}
				variant="ghost"
				type="button"
				style={{ borderRadius: "var(--radius-md)" }}
				className={`sidebar-nav-item ${activeId === item.id ? "active" : ""}`}
				onClick={() => onSelect(item.id)}
				aria-label={item.label}
				aria-pressed={activeId === item.id}
			>
				<Icon size={16} strokeWidth={2} />
				<span>{item.label}</span>
			</Button>
		)
	}

	return (
		<nav className="sidebar-nav" aria-label="Primary navigation">
			<div className="sidebar-nav-top">{items.map(renderItem)}</div>
			{bottomItems && <div className="sidebar-nav-bottom">{bottomItems.map(renderItem)}</div>}
		</nav>
	)
}
