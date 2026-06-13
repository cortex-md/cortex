import type { ReactNode } from "react"
import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import type { SidebarViewItem } from "./SidebarViewCarousel"

type SidebarViewDirection = "backward" | "forward"

interface SidebarViewTransition {
	currentId: string
	previousId: string | null
	direction: SidebarViewDirection
	revision: number
}

interface SidebarViewStageProps {
	activeId: string
	items: SidebarViewItem[]
	renderView: (id: string) => ReactNode
}

export function getSidebarViewDirection(
	items: SidebarViewItem[],
	fromId: string,
	toId: string,
): SidebarViewDirection {
	const fromIndex = items.findIndex((item) => item.id === fromId)
	const toIndex = items.findIndex((item) => item.id === toId)
	return fromIndex !== -1 && toIndex < fromIndex ? "backward" : "forward"
}

export function SidebarViewStage({ activeId, items, renderView }: SidebarViewStageProps) {
	const [transition, setTransition] = useState<SidebarViewTransition>({
		currentId: activeId,
		previousId: null,
		direction: "forward",
		revision: 0,
	})

	useLayoutEffect(() => {
		setTransition((currentTransition) => {
			if (currentTransition.currentId === activeId) return currentTransition
			return {
				currentId: activeId,
				previousId: currentTransition.currentId,
				direction: getSidebarViewDirection(items, currentTransition.currentId, activeId),
				revision: currentTransition.revision + 1,
			}
		})
	}, [activeId, items])

	const finishTransition = useCallback((revision: number) => {
		setTransition((currentTransition) =>
			currentTransition.revision === revision
				? { ...currentTransition, previousId: null }
				: currentTransition,
		)
	}, [])

	useEffect(() => {
		if (!transition.previousId) return
		const transitionDuration = document.body.dataset.reducedMotion === "true" ? 0 : 220
		const cleanupTimer = window.setTimeout(
			() => finishTransition(transition.revision),
			transitionDuration,
		)
		return () => window.clearTimeout(cleanupTimer)
	}, [finishTransition, transition.previousId, transition.revision])

	return (
		<div className="sidebar-view-stage">
			{transition.previousId && (
				<div
					key={`previous-${transition.revision}-${transition.previousId}`}
					className="sidebar-view-panel sidebar-view-panel--previous"
					data-direction={transition.direction}
					aria-hidden="true"
				>
					{renderView(transition.previousId)}
				</div>
			)}
			<div
				key={`current-${transition.revision}-${transition.currentId}`}
				id="sidebar-view-panel"
				role="tabpanel"
				aria-labelledby={`sidebar-view-tab-${transition.currentId}`}
				className={`sidebar-view-panel sidebar-view-panel--current ${
					transition.previousId ? "sidebar-view-panel--animated" : ""
				}`}
				data-direction={transition.direction}
				onAnimationEnd={() => finishTransition(transition.revision)}
			>
				{renderView(transition.currentId)}
			</div>
		</div>
	)
}
