import { Button } from "@cortex/ui"
import { ChevronLeftIcon } from "lucide-react"

interface PanelHeaderProps {
	title: string
	onBack?: () => void
}

export function PanelHeader({ title, onBack }: PanelHeaderProps) {
	return (
		<div className="note-property-popover-header">
			{onBack && (
				<Button variant="ghost" size="icon-xs" aria-label="Back" onClick={onBack}>
					<ChevronLeftIcon />
				</Button>
			)}
			<strong>{title}</strong>
		</div>
	)
}
