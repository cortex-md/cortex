"use client"

import { useEffect, useRef } from "react"
import ScrollReveal from "@/components/scroll-reveal"

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

			ctx!.save()
			ctx!.translate(state.offsetX, state.offsetY)
			ctx!.scale(state.scale, state.scale)

			for (const [a, b] of edgeList) {
				ctx!.beginPath()
				ctx!.moveTo(state.nodes[a].x, state.nodes[a].y)
				ctx!.lineTo(state.nodes[b].x, state.nodes[b].y)
				ctx!.strokeStyle = "rgba(65,64,64,0.6)"
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
				ctx!.fillStyle = node.accent ? "#E8A83C" : "rgba(65,64,64,0.9)"
				ctx!.fill()
				ctx!.strokeStyle = node.accent ? "rgba(232,168,60,0.5)" : "rgba(100,100,100,0.3)"
				ctx!.lineWidth = 1
				ctx!.stroke()

				ctx!.fillStyle = node.accent ? "#E8A83C" : "#6A6866"
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
		"Clique em qualquer nó para navegar até a nota",
		"Filtre por tags, pastas ou profundidade de conexão",
		'Identifique notas "hub" com muitas conexões',
		"Descubra orphan notes que precisam de contexto",
	]

	return (
		<section className="bg-primary py-24 px-10 overflow-hidden" id="graph">
			<div className="max-w-[1100px] mx-auto">
				<div className="grid gap-20 items-center" style={{ gridTemplateColumns: "1fr 1fr" }}>
					<ScrollReveal>
						<div
							className="text-[11.5px] font-semibold uppercase text-accent-light mb-3.5"
							style={{ letterSpacing: "0.08em" }}
						>
							04 — Graph View
						</div>
						<h2
							className="font-editor font-bold text-primary mb-7"
							style={{
								fontSize: "clamp(28px, 4vw, 42px)",
								lineHeight: 1.15,
								letterSpacing: "-0.025em",
							}}
						>
							Veja seu
							<br />
							conhecimento
							<br />
							<em className="not-italic text-accent">ganhar forma.</em>
						</h2>
						<p
							className="text-[16px] text-muted mb-7"
							style={{ lineHeight: 1.7, maxWidth: "540px" }}
						>
							Cada nota é um nó. Cada link é uma aresta. O grafo revela padrões, clusters temáticos
							e conexões inesperadas que você nunca perceberia lendo nota por nota.
						</p>
						<ul className="list-none flex flex-col gap-2.5" style={{ maxWidth: "380px" }}>
							{graphPoints.map((point) => (
								<li key={point} className="flex items-start gap-2.5 text-[13.5px] text-muted">
									<span className="w-[5px] h-[5px] rounded-full bg-accent flex-shrink-0 mt-[7px]" />
									{point}
								</li>
							))}
						</ul>
					</ScrollReveal>

					<ScrollReveal delay={0.2}>
						<div
							className="relative border border-border overflow-hidden"
							style={{
								height: "440px",
								background: "var(--color-bg-primary)",
								borderRadius: "14px",
							}}
						>
							<canvas
								ref={canvasRef}
								className="w-full h-full cursor-grab active:cursor-grabbing"
							/>
							<div className="absolute bottom-3.5 right-3.5 flex gap-2">
								{[
									{ label: "+", action: zoomIn },
									{ label: "−", action: zoomOut },
								].map(({ label, action }) => (
									<button
										key={label}
										type="button"
										onClick={action}
										className="w-7 h-7 border border-border bg-secondary text-muted cursor-pointer text-[16px] flex items-center justify-center transition-colors duration-150 hover:bg-secondary hover:text-primary"
										style={{ borderRadius: "var(--radius-md)" }}
									>
										{label}
									</button>
								))}
							</div>
						</div>
					</ScrollReveal>
				</div>
			</div>
		</section>
	)
}
