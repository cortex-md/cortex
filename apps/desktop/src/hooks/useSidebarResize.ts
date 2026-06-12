import { clampLeftSidebarWidth, useUIStore } from "@cortex/core"
import { useEffect, useRef } from "react"

interface SidebarResize {
	sidebarElementRef: React.RefObject<HTMLElement | null>
	handleSidebarResizeStart: (event: React.MouseEvent) => void
}

export function useSidebarResize(
	leftSidebarCollapsed: boolean,
	leftSidebarWidth: number,
	setLeftSidebarWidth: (width: number) => void,
): SidebarResize {
	const sidebarResizing = useRef(false)
	const sidebarResizeStart = useRef({ x: 0, width: 0 })
	const sidebarResizeWidth = useRef(leftSidebarWidth)
	const sidebarResizeFrame = useRef<number | null>(null)
	const sidebarElementRef = useRef<HTMLElement | null>(null)

	const applySidebarResizeWidth = (width: number) => {
		sidebarResizeWidth.current = clampLeftSidebarWidth(width)
		if (sidebarResizeFrame.current !== null) return
		sidebarResizeFrame.current = window.requestAnimationFrame(() => {
			sidebarResizeFrame.current = null
			if (sidebarElementRef.current) {
				sidebarElementRef.current.style.width = `${sidebarResizeWidth.current}px`
			}
		})
	}

	useEffect(() => {
		sidebarResizeWidth.current = leftSidebarWidth
		if (!sidebarResizing.current && sidebarElementRef.current) {
			sidebarElementRef.current.style.width = leftSidebarCollapsed ? "0px" : `${leftSidebarWidth}px`
		}
	}, [leftSidebarCollapsed, leftSidebarWidth])

	useEffect(() => {
		return () => {
			if (sidebarResizeFrame.current !== null) {
				window.cancelAnimationFrame(sidebarResizeFrame.current)
			}
		}
	}, [])

	const handleSidebarResizeStart = (event: React.MouseEvent) => {
		sidebarResizing.current = true
		sidebarResizeStart.current = { x: event.clientX, width: leftSidebarWidth }
		sidebarResizeWidth.current = leftSidebarWidth
		event.preventDefault()

		const handleMouseMove = (moveEvent: MouseEvent) => {
			if (!sidebarResizing.current) return
			const delta = moveEvent.clientX - sidebarResizeStart.current.x
			applySidebarResizeWidth(sidebarResizeStart.current.width + delta)
		}

		const handleMouseUp = () => {
			sidebarResizing.current = false
			if (sidebarResizeFrame.current !== null) {
				window.cancelAnimationFrame(sidebarResizeFrame.current)
				sidebarResizeFrame.current = null
			}
			if (sidebarElementRef.current) {
				sidebarElementRef.current.style.width = `${sidebarResizeWidth.current}px`
			}
			if (sidebarResizeWidth.current !== useUIStore.getState().leftSidebarWidth) {
				setLeftSidebarWidth(sidebarResizeWidth.current)
			}
			document.removeEventListener("mousemove", handleMouseMove)
			document.removeEventListener("mouseup", handleMouseUp)
		}

		document.addEventListener("mousemove", handleMouseMove)
		document.addEventListener("mouseup", handleMouseUp)
	}

	return { sidebarElementRef, handleSidebarResizeStart }
}
