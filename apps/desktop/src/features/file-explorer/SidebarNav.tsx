import { Button, LucideIcon } from "@cortex/ui"
import type { LucideIcon as LucideIconType } from "lucide-react"
import { useInternalDragSource } from "../split-view/useInternalDragSource"

export interface NavItem {
	id: string
	viewId?: string
	icon: LucideIconType | string
	label: string
	draggable?: boolean
}

interface Props {
	items: NavItem[]
	bottomItems?: NavItem[]
	activeId: string | null
	onSelect: (id: string) => void
}

interface SidebarNavItemProps {
	item: NavItem
	isActive: boolean
	onSelect: (id: string) => void
}

function SidebarNavItem({ item, isActive, onSelect }: SidebarNavItemProps) {
	const canDrag = item.draggable !== false
	const viewId = item.viewId ?? item.id
	const dragProps = useInternalDragSource(
		() => ({
			type: "sidebar-view",
			viewId,
			viewTitle: item.label,
		}),
		{ disabled: !canDrag },
	)

	return (
		<Button
			variant="ghost"
			type="button"
			className={`sidebar-nav-item flex text-xs justify-start w-full ${
				isActive ? "bg-accent" : ""
			}`}
			onClick={() => onSelect(item.id)}
			{...dragProps}
			aria-label={item.label}
			aria-pressed={isActive}
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

export function SidebarNav({ items, bottomItems, activeId, onSelect }: Props) {
	return (
		<nav
			className="sidebar-nav w-full flex flex-col items-start px-1.5 gap-1.5"
			aria-label="Primary navigation"
		>
			<div className="flex flex-col w-full gap-1.5">
				{items.map((item) => (
					<SidebarNavItem
						key={item.id}
						item={item}
						isActive={activeId === item.id}
						onSelect={onSelect}
					/>
				))}
			</div>
			{bottomItems && (
				<div className="flex flex-col w-full gap-1.5">
					{bottomItems.map((item) => (
						<SidebarNavItem
							key={item.id}
							item={item}
							isActive={activeId === item.id}
							onSelect={onSelect}
						/>
					))}
				</div>
			)}
		</nav>
	)
}
