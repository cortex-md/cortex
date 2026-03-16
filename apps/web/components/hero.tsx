"use client"

import { Badge, Button } from "@cortex/ui"
import Link from "next/link"
import { useState } from "react"
import DesktopMock from "@/components/editor-preview"

export default function Hero() {
	const [activeFileIndex, setActiveFileIndex] = useState(0)

	return (
		<section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-[120px] pb-20 text-center">
			{/* Background decorations */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="hero-bg-grain" />
				<div
					className="pointer-events-none absolute rounded-full"
					style={{
						width: "800px",
						height: "500px",
						background: "radial-gradient(ellipse, rgba(232,168,60,0.07) 0%, transparent 70%)",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -60%)",
					}}
				/>
				<div className="hero-bg-grid" />
			</div>

			<div className="relative z-10 mx-auto flex w-full max-w-[1000px] flex-col items-center">
				<Badge
					className="hero-badge mb-8 border px-3 py-[5px] text-[12.5px] font-medium"
					style={{
						background: "var(--accent-subtle)",
						borderColor: "var(--accent-border)",
						color: "var(--accent-text)",
					}}
				>
					<span
						className="dot-pulse mr-2 inline-block h-1.5 w-1.5 rounded-full"
						style={{ background: "var(--accent)" }}
						aria-hidden="true"
					/>
					Cross-device sync now available
				</Badge>

				<h1
					className="hero-title max-w-[820px] font-editor text-primary"
					style={{
						fontSize: "clamp(42px, 7vw, 74px)",
						fontWeight: 700,
						lineHeight: 1.08,
						letterSpacing: "-0.03em",
					}}
				>
					A markdown editor that
					<br />
					<em className="not-italic" style={{ color: "var(--accent)" }}>
						thinks with you.
					</em>
				</h1>

				<p
					className="hero-subtitle mt-5 max-w-[500px] text-muted-foreground"
					style={{ fontSize: "17px", lineHeight: 1.65 }}
				>
					Local-first, plain Markdown files. Wikilinks, graph view, and E2E encrypted sync — all
					without giving up ownership of your data.
				</p>

				<div className="hero-actions mt-9 flex flex-wrap justify-center gap-3">
					<Button
						size="lg"
						className="px-[22px] text-[15px] font-semibold"
						style={{
							background: "var(--accent)",
							color: "var(--text-on-accent)",
						}}
					>
						<svg
							aria-hidden="true"
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2.2"
							strokeLinecap="round"
						>
							<path d="M12 5v14m7-7l-7 7-7-7" />
						</svg>
						Download for macOS
					</Button>

					<Button
						size="lg"
						variant="outline"
						asChild
						className="px-[22px] text-[15px] font-semibold"
					>
						<Link href="/docs">Read the docs</Link>
					</Button>
				</div>

				<p className="hero-meta mt-[18px] text-[12.5px] text-muted-foreground">
					Free for personal use · macOS · Windows · Linux · iOS · Android
				</p>

				{/* Interactive desktop mock */}
				<div className="mt-[60px] w-full">
					<DesktopMock activeFileIndex={activeFileIndex} onFileSelect={setActiveFileIndex} />
					<p className="mt-3 text-[12px] text-muted-foreground">
						Click a file in the sidebar to navigate
					</p>
				</div>
			</div>
		</section>
	)
}
