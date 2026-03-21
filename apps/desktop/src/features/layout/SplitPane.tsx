import type { ReactNode } from "react"
import { useRef } from "react"

export interface LeafNode {
	type: "leaf"
	id: string
}

export interface SplitNode {
	type: "split"
	id: string
	direction: "horizontal" | "vertical"
	children: SplitTree[]
	sizes: number[]
}

export type SplitTree = LeafNode | SplitNode

interface Props {
	node: SplitTree
	renderLeaf: (paneId: string) => ReactNode
	onResize: (nodeId: string, sizes: number[]) => void
}

interface ResizerProps {
	direction: "horizontal" | "vertical"
	onDrag: (delta: number) => void
}

function Resizer({ direction, onDrag }: ResizerProps) {
	const startPos = useRef(0)
	const dragging = useRef(false)

	const handlePointerDown = (e: React.PointerEvent) => {
		e.preventDefault()
		e.currentTarget.setPointerCapture(e.pointerId)
		startPos.current = direction === "horizontal" ? e.clientX : e.clientY
		dragging.current = true
		document.body.style.userSelect = "none"
	}

	const handlePointerMove = (e: React.PointerEvent) => {
		if (!dragging.current) return
		const current = direction === "horizontal" ? e.clientX : e.clientY
		const delta = current - startPos.current
		if (delta !== 0) {
			onDrag(delta)
			startPos.current = current
		}
	}

	const handlePointerUp = (e: React.PointerEvent) => {
		if (!dragging.current) return
		dragging.current = false
		e.currentTarget.releasePointerCapture(e.pointerId)
		document.body.style.userSelect = ""
	}

	return (
		<div
			className={`split-resizer split-resizer--${direction}`}
			onPointerDown={handlePointerDown}
			onPointerMove={handlePointerMove}
			onPointerUp={handlePointerUp}
			aria-hidden="true"
		/>
	)
}

export function SplitPaneView({ node, renderLeaf, onResize }: Props) {
	const containerRef = useRef<HTMLDivElement>(null)

	if (node.type === "leaf") {
		return <div className="split-leaf">{renderLeaf(node.id)}</div>
	}

	const { direction, children, sizes } = node

	const handleDrag = (index: number, delta: number) => {
		const container = containerRef.current
		if (!container) return
		const totalSize = direction === "horizontal" ? container.offsetWidth : container.offsetHeight
		const deltaPercent = (delta / totalSize) * 100
		const newSizes = [...sizes]
		newSizes[index] = Math.max(10, newSizes[index] + deltaPercent)
		newSizes[index + 1] = Math.max(10, newSizes[index + 1] - deltaPercent)
		onResize(node.id, newSizes)
	}

	const elements: ReactNode[] = []
	for (let i = 0; i < children.length; i++) {
		const child = children[i]
		if (i > 0) {
			elements.push(
				<Resizer
					key={`resizer-${i}`}
					direction={direction}
					onDrag={(delta) => handleDrag(i - 1, delta)}
				/>,
			)
		}
		elements.push(
			<div key={child.id} className="split-child" style={{ flex: sizes[i] / 100 }}>
				<SplitPaneView node={child} renderLeaf={renderLeaf} onResize={onResize} />
			</div>,
		)
	}

	return (
		<div ref={containerRef} className={`split-container split-container--${direction}`}>
			{elements}
		</div>
	)
}
