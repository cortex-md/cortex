import { Button, LucideIcon } from "@cortex/ui"
import type { LucideIcon as LucideIconType } from "lucide-react"

export interface NavItem {
	id: string
	icon: LucideIconType | string
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
		return (
			<Button
				key={item.id}
				variant="ghost"
				type="button"
				className={`flex text-xs justify-start w-full ${activeId === item.id && "bg-accent"}`}
				onClick={() => onSelect(item.id)}
				aria-label={item.label}
				aria-pressed={activeId === item.id}
			>
				{typeof item.icon === "string" ? (
					<LucideIcon name={item.icon} size={14} strokeWidth={2} />
				) : (
					<item.icon size={14} strokeWidth={2} />
				)}
				<span>{item.label}</span>
			</Button>
		)
	}

	return (
		<nav className="w-full flex flex-col items-start px-1.5" aria-label="Primary navigation">
			<div className="flex flex-col w-full">{items.map(renderItem)}</div>
			{bottomItems && <div className="w-full">{bottomItems.map(renderItem)}</div>}
		</nav>
	)
}
