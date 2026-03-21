import type { DropZone } from "@cortex/core"
import { useDragStore } from "@cortex/core"
import { useCallback, useEffect, useRef, useState } from "react"

interface Props {
	paneId: string
}

function calculateZone(rect: DOMRect, clientX: number, clientY: number): DropZone {
	const relX = (clientX - rect.left) / rect.width
	const relY = (clientY - rect.top) / rect.height
	const edgeThreshold = 0.25

	if (relX < edgeThreshold) return "left"
	if (relX > 1 - edgeThreshold) return "right"
	if (relY < edgeThreshold) return "top"
	if (relY > 1 - edgeThreshold) return "bottom"
	return "center"
}

const zoneStyles: Record<DropZone, string> = {
	center: "inset-4",
	left: "inset-y-2 left-2 w-[45%]",
	right: "inset-y-2 right-2 w-[45%]",
	top: "inset-x-2 top-2 h-[45%]",
	bottom: "inset-x-2 bottom-2 h-[45%]",
}

export function DropZoneOverlay({ paneId }: Props) {
	const isDragging = useDragStore((s) => !!s.dragSource)
	const [hoveredZone, setHoveredZone] = useState<DropZone | null>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (!isDragging) setHoveredZone(null)
	}, [isDragging])

	const handleDragOver = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			e.dataTransfer.dropEffect = "move"
			const rect = containerRef.current?.getBoundingClientRect()
			if (!rect) return
			const zone = calculateZone(rect, e.clientX, e.clientY)
			setHoveredZone(zone)
			useDragStore.getState().updateDropTarget({ paneId, zone })
		},
		[paneId],
	)

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			const rect = containerRef.current?.getBoundingClientRect()
			if (rect) {
				const zone = calculateZone(rect, e.clientX, e.clientY)
				useDragStore.getState().updateDropTarget({ paneId, zone })
			}
			setHoveredZone(null)
			useDragStore.getState().completeDrop()
		},
		[paneId],
	)

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
			setHoveredZone(null)
			useDragStore.getState().updateDropTarget(null)
		}
	}, [])

	if (!isDragging) return null

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop zone overlay for drag-and-drop
		<div
			ref={containerRef}
			className="absolute inset-0 z-50"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onDragLeave={handleDragLeave}
		>
			{hoveredZone && (
				<>
					<div className="absolute inset-0 bg-foreground/5 rounded pointer-events-none" />
					<div
						className={`absolute ${zoneStyles[hoveredZone]} rounded-lg bg-brand/10 border-2 border-brand/30 pointer-events-none transition-all duration-150`}
					/>
				</>
			)}
		</div>
	)
}
