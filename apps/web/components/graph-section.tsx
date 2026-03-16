"use client"

import { useEffect, useRef } from "react"

interface GraphNode {
	label: string
	accent?: boolean
	size: number
	x: number
	y: number
	vx: number
	vy: number
}

const nodeData = [
	{ label: "Projeto Alpha", accent: true, size: 10 },
	{ label: "Sprint 08", size: 7 },
	{ label: "Reunião", size: 7 },
	{ label: "Arquitetura", size: 7 },
	{ label: "ADR-014", size: 5 },
	{ label: "Leituras", size: 5 },
	{ label: "Notas Diárias", size: 6 },
	{ label: "Roadmap", size: 5 },
	{ label: "Stack", size: 5 },
	{ label: "Post-mortem", size: 5 },
	{ label: "CI/CD", size: 4 },
	{ label: "Deploy", size: 4 },
	{ label: "Produto", size: 6 },
	{ label: "Clientes", size: 4 },
	{ label: "Research", size: 5 },
]

const edgeList: [number, number][] = [
	[0, 1],
	[0, 2],
	[0, 3],
	[0, 5],
	[0, 6],
	[0, 12],
	[1, 6],
	[1, 8],
	[2, 12],
	[3, 4],
	[3, 8],
	[3, 9],
	[4, 10],
	[5, 14],
	[6, 7],
	[7, 12],
	[8, 10],
	[8, 11],
	[9, 10],
	[12, 13],
	[14, 5],
]

export default function GraphSection() {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const stateRef = useRef({
		nodes: [] as GraphNode[],
		scale: 1,
		offsetX: 0,
		offsetY: 0,
		isDragging: false,
		dragStart: { x: 0, y: 0 },
		animFrame: 0,
		time: 0,
		simCount: 0,
	})

	function zoomIn() {
		stateRef.current.scale = Math.min(2.5, stateRef.current.scale * 1.2)
	}

	function zoomOut() {
		stateRef.current.scale = Math.max(0.4, stateRef.current.scale * 0.8)
	}

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return
		const state = stateRef.current

		function initGraph() {
			const w = canvas!.offsetWidth
			const h = canvas!.offsetHeight
			const dpr = window.devicePixelRatio || 1
			canvas!.width = w * dpr
			canvas!.height = h * dpr
			ctx!.scale(dpr, dpr)

			state.nodes = nodeData.map((d, i) => ({
				...d,
				x: w * 0.5 + Math.cos((i / nodeData.length) * Math.PI * 2) * w * 0.32,
				y: h * 0.5 + Math.sin((i / nodeData.length) * Math.PI * 2) * h * 0.32,
				vx: 0,
				vy: 0,
			}))

			for (const node of state.nodes) {
				node.x += (Math.random() - 0.5) * 60
				node.y += (Math.random() - 0.5) * 60
			}

			state.scale = 1
			state.offsetX = 0
			state.offsetY = 0
			state.simCount = 0
			state.time = 0

			cancelAnimationFrame(state.animFrame)
			animate()
		}

		function simulate() {
			const w = canvas!.width / (window.devicePixelRatio || 1)
			const h = canvas!.height / (window.devicePixelRatio || 1)
			const nodes = state.nodes

			for (let i = 0; i < nodes.length; i++) {
				for (let j = i + 1; j < nodes.length; j++) {
					const dx = nodes[j].x - nodes[i].x
					const dy = nodes[j].y - nodes[i].y
					const dist = Math.sqrt(dx * dx + dy * dy) || 1
					const force = 1200 / (dist * dist)
					const fx = (dx / dist) * force
					const fy = (dy / dist) * force
					nodes[i].vx -= fx
					nodes[i].vy -= fy
					nodes[j].vx += fx
					nodes[j].vy += fy
				}
			}

			for (const [a, b] of edgeList) {
				const dx = nodes[b].x - nodes[a].x
				const dy = nodes[b].y - nodes[a].y
				const dist = Math.sqrt(dx * dx + dy * dy) || 1
				const force = (dist - 100) * 0.005
				const fx = (dx / dist) * force
				const fy = (dy / dist) * force
				nodes[a].vx += fx
				nodes[a].vy += fy
				nodes[b].vx -= fx
				nodes[b].vy -= fy
			}

			for (const node of nodes) {
				node.vx += (w * 0.5 - node.x) * 0.002
				node.vy += (h * 0.5 - node.y) * 0.002
				node.vx *= 0.88
				node.vy *= 0.88
				node.x += node.vx
				node.y += node.vy
				node.x = Math.max(20, Math.min(w - 20, node.x))
				node.y = Math.max(20, Math.min(h - 20, node.y))
			}
		}

		function drawFrame() {
			const w = canvas!.width / (window.devicePixelRatio || 1)
			const h = canvas!.height / (window.devicePixelRatio || 1)
			ctx!.clearRect(0, 0, w, h)

			const style = getComputedStyle(document.documentElement)
			const nodeColor = style.getPropertyValue("--graph-node").trim() || "#414040"
			const edgeColor = style.getPropertyValue("--graph-edge").trim() || "rgba(65,64,64,0.6)"
			const accentColor = style.getPropertyValue("--accent").trim() || "#E8A83C"
			const labelColor = style.getPropertyValue("--text-muted").trim() || "#6A6866"

			ctx!.save()
			ctx!.translate(state.offsetX, state.offsetY)
			ctx!.scale(state.scale, state.scale)

			for (const [a, b] of edgeList) {
				ctx!.beginPath()
				ctx!.moveTo(state.nodes[a].x, state.nodes[a].y)
				ctx!.lineTo(state.nodes[b].x, state.nodes[b].y)
				ctx!.strokeStyle = edgeColor
				ctx!.lineWidth = 1
				ctx!.stroke()
			}

			for (const node of state.nodes) {
				if (node.accent) {
					const pulse = Math.sin(state.time * 0.04) * 3
					ctx!.beginPath()
					ctx!.arc(node.x, node.y, node.size + 6 + pulse, 0, Math.PI * 2)
					ctx!.fillStyle = "rgba(232,168,60,0.1)"
					ctx!.fill()
				}

				ctx!.beginPath()
				ctx!.arc(node.x, node.y, node.size, 0, Math.PI * 2)
				ctx!.fillStyle = node.accent ? accentColor : nodeColor
				ctx!.fill()
				ctx!.strokeStyle = node.accent ? "rgba(232,168,60,0.5)" : "rgba(100,100,100,0.3)"
				ctx!.lineWidth = 1
				ctx!.stroke()

				ctx!.fillStyle = node.accent ? accentColor : labelColor
				ctx!.font = `${node.accent ? "600" : "400"} 10px DM Sans`
				ctx!.textAlign = "center"
				ctx!.fillText(node.label, node.x, node.y + node.size + 13)
			}

			ctx!.restore()
		}

		function animate() {
			state.time++
			if (state.simCount < 200) {
				simulate()
				state.simCount++
			}
			drawFrame()
			state.animFrame = requestAnimationFrame(animate)
		}

		function handleMouseDown(e: MouseEvent) {
			state.isDragging = true
			state.dragStart = { x: e.clientX - state.offsetX, y: e.clientY - state.offsetY }
		}

		function handleMouseMove(e: MouseEvent) {
			if (!state.isDragging) return
			state.offsetX = e.clientX - state.dragStart.x
			state.offsetY = e.clientY - state.dragStart.y
		}

		function handleMouseUp() {
			state.isDragging = false
		}

		function handleWheel(e: WheelEvent) {
			e.preventDefault()
			const factor = e.deltaY < 0 ? 1.1 : 0.9
			state.scale = Math.max(0.4, Math.min(2.5, state.scale * factor))
		}

		function handleResize() {
			initGraph()
		}

		canvas.addEventListener("mousedown", handleMouseDown)
		window.addEventListener("mousemove", handleMouseMove)
		window.addEventListener("mouseup", handleMouseUp)
		canvas.addEventListener("wheel", handleWheel, { passive: false })
		window.addEventListener("resize", handleResize)

		document.fonts.ready.then(initGraph)

		return () => {
			cancelAnimationFrame(state.animFrame)
			canvas.removeEventListener("mousedown", handleMouseDown)
			window.removeEventListener("mousemove", handleMouseMove)
			window.removeEventListener("mouseup", handleMouseUp)
			canvas.removeEventListener("wheel", handleWheel)
			window.removeEventListener("resize", handleResize)
		}
	}, [])

	const graphPoints = [
		"Click any node to open the note",
		"Filter by tag, folder, or connection depth",
		"Identify hub notes with many connections",
		"Discover orphan notes that need more context",
	]

	return (
		<section
			className="overflow-hidden px-6 py-24"
			id="graph"
			style={{ background: "var(--bg-primary)" }}
		>
			<div className="mx-auto max-w-[1100px]">
				<div className="grid items-center gap-16" style={{ gridTemplateColumns: "1fr 1fr" }}>
					{/* Left: copy */}
					<div>
						<div
							className="mb-3.5 text-[11.5px] font-semibold uppercase"
							style={{ letterSpacing: "0.08em", color: "var(--accent)" }}
						>
							03 — Graph View
						</div>
						<h2
							className="mb-6 font-editor font-bold text-primary"
							style={{
								fontSize: "clamp(28px, 4vw, 44px)",
								lineHeight: 1.12,
								letterSpacing: "-0.025em",
							}}
						>
							See your knowledge
							<br />
							<em className="not-italic" style={{ color: "var(--accent)" }}>
								take shape.
							</em>
						</h2>
						<p
							className="mb-7 text-muted-foreground"
							style={{ fontSize: "16px", lineHeight: 1.7, maxWidth: "440px" }}
						>
							Each note is a node. Each link is an edge. The graph reveals clusters, themes, and
							unexpected connections you'd never spot reading note by note.
						</p>
						<ul className="flex list-none flex-col gap-2.5" style={{ maxWidth: "380px" }}>
							{graphPoints.map((point) => (
								<li
									key={point}
									className="flex items-start gap-2.5 text-[13.5px] text-muted-foreground"
								>
									<span
										className="mt-[7px] flex-shrink-0 rounded-full"
										style={{ width: "5px", height: "5px", background: "var(--accent)" }}
									/>
									{point}
								</li>
							))}
						</ul>
					</div>

					{/* Right: graph canvas in app window */}
					<div
						className="relative overflow-hidden"
						style={{
							height: "460px",
							background: "var(--bg-primary)",
							borderRadius: "12px",
							border: "1px solid var(--border)",
							boxShadow: "0 24px 56px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.1)",
						}}
					>
						{/* App toolbar */}
						<div
							className="flex items-center gap-3 px-4 py-[9px]"
							style={{
								background: "var(--sidebar-bg)",
								borderBottom: "1px solid var(--border-subtle)",
							}}
						>
							<div className="flex items-center gap-[6px]">
								<div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
								<div className="h-3 w-3 rounded-full" style={{ background: "#febc2e" }} />
								<div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
							</div>
							<span className="flex-1 text-center font-mono text-[11px] text-muted-foreground">
								Graph View — Meu Vault
							</span>
							<div className="flex items-center gap-1.5">
								{[
									{ label: "+", action: zoomIn, title: "Zoom in" },
									{ label: "−", action: zoomOut, title: "Zoom out" },
								].map(({ label, action, title }) => (
									<button
										key={label}
										type="button"
										onClick={action}
										title={title}
										className="flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded text-[14px] text-muted-foreground transition-colors duration-150 hover:text-primary"
										style={{
											background: "var(--bg-secondary)",
											border: "1px solid var(--border-subtle)",
										}}
									>
										{label}
									</button>
								))}
							</div>
						</div>
						<canvas
							ref={canvasRef}
							className="h-[calc(100%-37px)] w-full cursor-grab active:cursor-grabbing"
						/>
					</div>
				</div>
			</div>
		</section>
	)
}
