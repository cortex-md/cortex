"use client"

import { useEffect, useRef, useState } from "react"

const steps = [
	{
		num: 1,
		title: "Capture qualquer ideia",
		desc: "Crie notas em Markdown puro. Use templates para reuniões, projetos ou diários. O Quick Capture abre em qualquer lugar do sistema com um atalho.",
	},
	{
		num: 2,
		title: "Conecte com [[wikilinks]]",
		desc: "Digite [[ para vincular a qualquer nota do vault. Os backlinks se formam automaticamente, criando uma teia de contexto.",
	},
	{
		num: 3,
		title: "Explore no Graph View",
		desc: "Abra o grafo e veja seu conhecimento ganhar forma. Clique em qualquer nó para navegar. Filtre por tags, pastas ou profundidade de conexão.",
	},
	{
		num: 4,
		title: "Sincronize entre dispositivos",
		desc: "Com o Cortex Sync, seu vault fica disponível em todos os dispositivos com criptografia ponta-a-ponta. Ou use Git, iCloud, Dropbox — a escolha é sua.",
	},
]

export default function DemoSection() {
	const [activeStep, setActiveStep] = useState(1)

	function handleStepClick(num: number) {
		setActiveStep(num)
	}

	return (
		<section className="bg-ink-900 py-24 px-10" id="how">
			<div className="max-w-[1100px] mx-auto">
				<div className="reveal">
					<div
						className="text-[11.5px] font-semibold uppercase text-accent-light mb-3.5"
						style={{ letterSpacing: "0.08em" }}
					>
						02 — Como funciona
					</div>
					<h2
						className="font-editor font-bold text-ink-50"
						style={{
							fontSize: "clamp(28px, 4vw, 42px)",
							lineHeight: 1.15,
							letterSpacing: "-0.025em",
						}}
					>
						Da captura
						<br />
						<em className="not-italic text-accent">à insight.</em>
					</h2>
				</div>

				<div className="grid gap-20 mt-16 items-start" style={{ gridTemplateColumns: "1fr 1fr" }}>
					<div className="flex flex-col">
						{steps.map((step) => (
							<div
								key={step.num}
								className="flex gap-5 py-7 border-b border-ink-500 cursor-pointer transition-all duration-200 last:border-b-0"
								onClick={() => handleStepClick(step.num)}
							>
								<div
									className="w-[30px] h-[30px] rounded-full border flex items-center justify-center text-[12px] font-semibold font-mono flex-shrink-0 mt-0.5 transition-all duration-200"
									style={
										activeStep === step.num
											? {
													background: "var(--color-accent)",
													borderColor: "var(--color-accent)",
													color: "var(--color-ink-900)",
												}
											: {
													borderColor: "var(--color-ink-400)",
													color: "var(--color-ink-300)",
												}
									}
								>
									{step.num}
								</div>
								<div className="flex-1">
									<div
										className="text-[15px] font-semibold mb-1 transition-colors duration-200"
										style={{
											letterSpacing: "-0.01em",
											color:
												activeStep === step.num ? "var(--color-accent)" : "var(--color-ink-50)",
										}}
									>
										{step.title}
									</div>
									<div className="text-[13.5px] text-ink-200" style={{ lineHeight: 1.6 }}>
										{step.num === 2 ? (
											<>
												Digite{" "}
												<code
													className="font-mono text-[12px] px-[5px] py-px"
													style={{
														background: "rgba(65,64,64,0.6)",
														borderRadius: "3px",
													}}
												>
													[[
												</code>{" "}
												para vincular a qualquer nota do vault. Os backlinks se formam
												automaticamente, criando uma teia de contexto.
											</>
										) : (
											step.desc
										)}
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="sticky top-20">
						{activeStep === 1 && <StepFrameCapture />}
						{activeStep === 2 && <StepFrameWikilinks />}
						{activeStep === 3 && <StepFrameGraph />}
						{activeStep === 4 && <StepFrameSync />}
					</div>
				</div>
			</div>
		</section>
	)
}

function MockWindow({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div
			className="bg-ink-700 border border-ink-400 overflow-hidden"
			style={{
				borderRadius: "14px",
				boxShadow: "0 20px 25px rgba(0,0,0,.40), 0 10px 10px rgba(0,0,0,.28)",
			}}
		>
			<div className="h-[38px] bg-ink-600 border-b border-ink-400 flex items-center px-3.5 gap-2.5">
				<div className="flex gap-[5px]">
					<div className="w-[9px] h-[9px] rounded-full" style={{ background: "#FF5F57" }} />
					<div className="w-[9px] h-[9px] rounded-full" style={{ background: "#FFBC2E" }} />
					<div className="w-[9px] h-[9px] rounded-full" style={{ background: "#28C840" }} />
				</div>
				<span className="text-[12px] text-ink-300 ml-2">{title}</span>
			</div>
			<div className="p-6">{children}</div>
		</div>
	)
}

function StepFrameCapture() {
	return (
		<MockWindow title="Nova nota — Quick Capture">
			<div
				className="bg-ink-800 border border-ink-400 p-3 mb-3.5"
				style={{ borderRadius: "var(--radius-md)" }}
			>
				<div className="flex items-center gap-2 border-b border-ink-500 pb-2.5 mb-2.5">
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="var(--color-ink-300)"
						strokeWidth="2"
						strokeLinecap="round"
					>
						<circle cx="11" cy="11" r="8" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<span className="text-[13px] text-ink-300">Pesquisar ou criar nota...</span>
				</div>
				<div className="text-[13px] text-ink-200 mb-1.5">Templates recentes:</div>
				<div className="flex flex-col gap-1">
					{[
						{ emoji: "📝", label: "Nota diária", active: true },
						{ emoji: "📅", label: "Reunião", active: false },
						{ emoji: "🚀", label: "Projeto", active: false },
					].map((item) => (
						<div
							key={item.label}
							className="px-2.5 py-1.5 text-[12.5px] cursor-pointer"
							style={{
								borderRadius: "var(--radius-md)",
								background: item.active ? "rgba(232,168,60,0.08)" : "var(--color-ink-600)",
								border: item.active ? "1px solid rgba(232,168,60,0.15)" : "1px solid transparent",
								color: item.active ? "var(--color-accent-light)" : "var(--color-ink-200)",
							}}
						>
							{item.emoji} {item.label}
						</div>
					))}
				</div>
			</div>
			<div className="text-[12px] text-ink-300 text-center">
				⌘ + N para nova nota &nbsp;·&nbsp; ⌘ + O para abrir
			</div>
		</MockWindow>
	)
}

function StepFrameWikilinks() {
	return (
		<MockWindow title="Conexões automáticas">
			<div className="font-editor text-[14px] leading-[1.75] text-ink-100">
				<p className="mb-3">
					Esta ideia surgiu durante{" "}
					<span
						className="px-1 py-px"
						style={{
							color: "var(--color-accent-light)",
							background: "rgba(232,168,60,0.1)",
							borderRadius: "3px",
						}}
					>
						[[Reunião Produto]]
					</span>{" "}
					e conecta diretamente com{" "}
					<span
						className="px-1 py-px"
						style={{
							color: "var(--color-accent-light)",
							background: "rgba(232,168,60,0.1)",
							borderRadius: "3px",
						}}
					>
						[[Arquitetura v2]]
					</span>
					.
				</p>
				<div
					className="border border-ink-400 p-2.5 mt-3.5"
					style={{
						background: "rgba(65,64,64,0.5)",
						borderRadius: "var(--radius-md)",
					}}
				>
					<div
						className="text-[11px] font-semibold uppercase text-ink-300 mb-2"
						style={{ letterSpacing: "0.06em" }}
					>
						Sugestões de link
					</div>
					<div className="flex flex-col gap-1.5">
						<div
							className="flex items-center gap-2 px-2 py-[5px] cursor-pointer"
							style={{
								borderRadius: "var(--radius-sm)",
								background: "rgba(232,168,60,0.08)",
							}}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--color-accent-light)"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
							</svg>
							<span className="text-[12px] text-accent-light">Sprint 08</span>
							<span className="text-[11px] text-ink-300 ml-auto">↩ Enter</span>
						</div>
						<div
							className="flex items-center gap-2 px-2 py-[5px] cursor-pointer"
							style={{ borderRadius: "var(--radius-sm)" }}
						>
							<svg
								width="12"
								height="12"
								viewBox="0 0 24 24"
								fill="none"
								stroke="var(--color-ink-300)"
								strokeWidth="2"
								strokeLinecap="round"
							>
								<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
							</svg>
							<span className="text-[12px] text-ink-200">Roadmap 2025</span>
						</div>
					</div>
				</div>
			</div>
		</MockWindow>
	)
}

function StepFrameGraph() {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext("2d")
		if (!ctx) return

		const w = canvas.offsetWidth
		const h = canvas.offsetHeight
		const dpr = window.devicePixelRatio || 1
		canvas.width = w * dpr
		canvas.height = h * dpr
		ctx.scale(dpr, dpr)

		const nodes = [
			{ x: w * 0.5, y: h * 0.45, r: 9, label: "Alpha", accent: true },
			{ x: w * 0.25, y: h * 0.25, r: 6, label: "Sprint 08", accent: false },
			{ x: w * 0.75, y: h * 0.2, r: 6, label: "Reunião", accent: false },
			{ x: w * 0.8, y: h * 0.65, r: 5, label: "Stack", accent: false },
			{ x: w * 0.2, y: h * 0.7, r: 5, label: "ADR-12", accent: false },
			{ x: w * 0.5, y: h * 0.8, r: 4, label: "Docs", accent: false },
			{ x: w * 0.1, y: h * 0.45, r: 4, label: "Notas", accent: false },
			{ x: w * 0.9, y: h * 0.4, r: 4, label: "Leituras", accent: false },
		]
		const edges = [
			[0, 1],
			[0, 2],
			[0, 3],
			[0, 4],
			[0, 5],
			[1, 6],
			[2, 7],
			[3, 7],
			[4, 5],
		]

		ctx.clearRect(0, 0, w, h)

		for (const [a, b] of edges) {
			ctx.beginPath()
			ctx.moveTo(nodes[a].x, nodes[a].y)
			ctx.lineTo(nodes[b].x, nodes[b].y)
			ctx.strokeStyle = "rgba(65,64,64,0.8)"
			ctx.lineWidth = 1
			ctx.stroke()
		}

		for (const node of nodes) {
			if (node.accent) {
				ctx.beginPath()
				ctx.arc(node.x, node.y, node.r + 5, 0, Math.PI * 2)
				ctx.fillStyle = "rgba(232,168,60,0.08)"
				ctx.fill()
			}
			ctx.beginPath()
			ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
			ctx.fillStyle = node.accent ? "#E8A83C" : "#414040"
			ctx.fill()
			ctx.strokeStyle = node.accent ? "rgba(232,168,60,0.5)" : "rgba(65,64,64,0.3)"
			ctx.lineWidth = 1
			ctx.stroke()

			ctx.fillStyle = node.accent ? "#E8A83C" : "#6A6866"
			ctx.font = `${node.accent ? 600 : 400} 10px DM Sans`
			ctx.textAlign = "center"
			ctx.fillText(node.label, node.x, node.y + node.r + 12)
		}
	}, [])

	return (
		<MockWindow title="Graph View — Local">
			<div className="relative" style={{ height: "220px", background: "var(--color-ink-800)" }}>
				<canvas ref={canvasRef} className="w-full h-full" />
			</div>
		</MockWindow>
	)
}

function StepFrameSync() {
	const devices = [
		{
			label: "iPhone 15 Pro",
			time: "há 2 min",
			icon: (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<rect x="5" y="2" width="14" height="20" rx="2" />
				</svg>
			),
		},
		{
			label: "MacBook Pro",
			time: "agora",
			icon: (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<rect x="2" y="3" width="20" height="14" rx="2" />
					<line x1="8" y1="21" x2="16" y2="21" />
					<line x1="12" y1="17" x2="12" y2="21" />
				</svg>
			),
		},
		{
			label: "iPad Air",
			time: "há 1h",
			icon: (
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
				>
					<rect x="2" y="7" width="20" height="14" rx="2" />
					<path d="M16 2l-4 5-4-5" />
				</svg>
			),
		},
	]

	return (
		<MockWindow title="Cortex Sync — Status">
			<div className="flex items-center justify-between mb-4">
				<span className="text-[13px] font-semibold text-ink-50">Vault: Trabalho</span>
				<span className="flex items-center gap-[5px] text-[12px]" style={{ color: "#4A9B6F" }}>
					<span
						className="w-1.5 h-1.5 rounded-full inline-block"
						style={{ background: "#4A9B6F" }}
					/>
					Sincronizado
				</span>
			</div>
			<div className="flex flex-col gap-2">
				{devices.map((device) => (
					<div
						key={device.label}
						className="flex justify-between items-center px-2.5 py-2 border border-ink-400 bg-ink-600"
						style={{ borderRadius: "var(--radius-md)" }}
					>
						<div className="flex items-center gap-2 text-[12.5px] text-ink-100">
							{device.icon}
							{device.label}
						</div>
						<span className="text-[11px] text-ink-300">{device.time}</span>
					</div>
				))}
			</div>
			<div className="mt-3.5 text-[12px] text-ink-300 text-center">
				🔒 Criptografia end-to-end ativa
			</div>
		</MockWindow>
	)
}
