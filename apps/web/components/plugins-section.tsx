"use client"

import { Kbd } from "@cortex/ui"
import { useEffect, useState } from "react"

interface Plugin {
	name: string
	description: string
	icon: React.ReactNode
}

function FolderIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M2 7h5l2-2h13v12a1 1 0 01-1 1H3a1 1 0 01-1-1V7z"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
		</svg>
	)
}

function SearchIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
			<path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	)
}

function GraphIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="19" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="12" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<path
				d="M7.5 5h9M6.5 7l4.5 10M17.5 7l-4.5 10"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	)
}

function CalendarIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
			<path d="M3 9h18M8 2v4m8-4v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	)
}

function TagIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<path
				d="M3 12L12.5 3H21v8.5L11.5 21 3 12z"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinejoin="round"
			/>
			<circle cx="16.5" cy="8" r="1.5" fill="currentColor" />
		</svg>
	)
}

function TemplateIcon() {
	return (
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
			<path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
		</svg>
	)
}

const plugins: Plugin[] = [
	{
		name: "File Explorer",
		description: "Navigate your vault with a tree view of files and folders.",
		icon: <FolderIcon />,
	},
	{
		name: "Quick Switcher",
		description: "Jump to any note instantly with fuzzy search.",
		icon: <SearchIcon />,
	},
	{
		name: "Graph View",
		description: "Visualize connections between all your notes.",
		icon: <GraphIcon />,
	},
	{
		name: "Daily Notes",
		description: "Auto-create a new note each day with a configurable template.",
		icon: <CalendarIcon />,
	},
	{
		name: "Tags",
		description: "Organize notes by #tags and browse by tag in the sidebar.",
		icon: <TagIcon />,
	},
	{
		name: "Templates",
		description: "Insert pre-built note skeletons with a single command.",
		icon: <TemplateIcon />,
	},
]

const commandPaletteItems = [
	{ label: "Open Quick Switcher", kbd: ["⌘", "P"] },
	{ label: "Toggle Graph View", kbd: ["⌘", "G"] },
	{ label: "New Daily Note", kbd: ["⌘", "⇧", "D"] },
	{ label: "Insert Template", kbd: ["⌘", "⇧", "T"] },
	{ label: "Toggle Live Preview", kbd: ["⌘", "E"] },
	{ label: "Sync Now", kbd: ["⌘", "⇧", "S"] },
]

function CommandPaletteMock() {
	const [displayQuery, setDisplayQuery] = useState("")
	const [cursorVisible, setCursorVisible] = useState(true)

	const targetQuery = "Toggle Graph"
	const filtered = commandPaletteItems.filter((item) =>
		item.label.toLowerCase().includes(displayQuery.toLowerCase()),
	)

	useEffect(() => {
		let charIndex = 0
		let typingTimeout: ReturnType<typeof setTimeout>
		let resetTimeout: ReturnType<typeof setTimeout>

		function typeChar() {
			if (charIndex <= targetQuery.length) {
				setDisplayQuery(targetQuery.slice(0, charIndex))
				charIndex++
				typingTimeout = setTimeout(typeChar, 80)
			} else {
				resetTimeout = setTimeout(() => {
					charIndex = 0
					setDisplayQuery("")
					typingTimeout = setTimeout(typeChar, 600)
				}, 2200)
			}
		}

		const startTimeout = setTimeout(typeChar, 800)

		const cursorInterval = setInterval(() => {
			setCursorVisible((v) => !v)
		}, 530)

		return () => {
			clearTimeout(startTimeout)
			clearTimeout(typingTimeout)
			clearTimeout(resetTimeout)
			clearInterval(cursorInterval)
		}
	}, [])

	return (
		<div
			className="overflow-hidden rounded-xl"
			style={{
				background: "var(--modal-bg)",
				border: "1px solid var(--menu-border)",
				boxShadow: "0 24px 60px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.14)",
				maxWidth: "480px",
				width: "100%",
			}}
		>
			{/* Search input */}
			<div
				className="flex items-center gap-2.5 px-4 py-3"
				style={{ borderBottom: "1px solid var(--border-subtle)" }}
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					className="flex-shrink-0 text-muted-foreground"
				>
					<circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
					<path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
				</svg>
				<span className="flex-1 font-mono text-[13px] text-primary">
					{displayQuery}
					<span
						className="inline-block w-[1px] align-middle"
						style={{
							height: "14px",
							background: "var(--accent)",
							opacity: cursorVisible ? 1 : 0,
							marginLeft: "1px",
							transition: "opacity 0.1s",
						}}
					/>
				</span>
				<Kbd className="text-[10.5px]">Esc</Kbd>
			</div>

			{/* Results */}
			<div className="py-1">
				{filtered.map((item, i) => (
					<div
						key={item.label}
						className="flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors duration-100"
						style={{
							background: i === 0 && displayQuery.length > 2 ? "var(--bg-active)" : "transparent",
						}}
					>
						<span
							className="text-[12.5px]"
							style={{
								color:
									i === 0 && displayQuery.length > 2 ? "var(--text-primary)" : "var(--text-muted)",
							}}
						>
							{item.label}
						</span>
						<div className="flex items-center gap-1">
							{item.kbd.map((key) => (
								<Kbd key={key} className="text-[10px]">
									{key}
								</Kbd>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default function PluginsSection() {
	return (
		<section
			id="plugins"
			className="overflow-hidden px-6 py-24"
			style={{ background: "var(--bg-primary)" }}
		>
			<div className="mx-auto max-w-[1100px]">
				{/* Header */}
				<div className="mb-14 flex flex-col items-center text-center">
					<div
						className="mb-3.5 text-[11.5px] font-semibold uppercase"
						style={{ letterSpacing: "0.08em", color: "var(--accent)" }}
					>
						05 — Plugins
					</div>
					<h2
						className="font-editor font-bold text-primary"
						style={{
							fontSize: "clamp(28px, 4vw, 44px)",
							lineHeight: 1.12,
							letterSpacing: "-0.025em",
							maxWidth: "600px",
						}}
					>
						Extend everything.{" "}
						<em className="not-italic" style={{ color: "var(--accent)" }}>
							Keep it simple.
						</em>
					</h2>
					<p
						className="mt-5 text-muted-foreground"
						style={{ fontSize: "16px", lineHeight: 1.7, maxWidth: "500px" }}
					>
						Core plugins ship built-in. Community plugins add what you need. Every feature is opt-in
						and replaceable.
					</p>
				</div>

				{/* Two-column layout: plugin grid + command palette */}
				<div className="grid items-start gap-14" style={{ gridTemplateColumns: "1fr 1fr" }}>
					{/* Plugin grid */}
					<div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr" }}>
						{plugins.map((plugin) => (
							<div
								key={plugin.name}
								className="rounded-xl p-4 transition-colors duration-150"
								style={{
									background: "var(--bg-secondary)",
									border: "1px solid var(--border-subtle)",
								}}
							>
								<div
									className="mb-3 rounded-lg p-2 w-fit"
									style={{
										background: "var(--bg-elevated)",
										border: "1px solid var(--border-subtle)",
										color: "var(--accent)",
									}}
								>
									{plugin.icon}
								</div>
								<div className="mb-1 text-[13px] font-semibold text-primary">{plugin.name}</div>
								<p className="text-[12px] text-muted-foreground" style={{ lineHeight: 1.6 }}>
									{plugin.description}
								</p>
							</div>
						))}
					</div>

					{/* Command palette + shortcuts */}
					<div className="flex flex-col gap-6">
						<div>
							<div className="mb-3 text-[12.5px] font-semibold text-primary">Command Palette</div>
							<CommandPaletteMock />
						</div>

						<div
							className="rounded-xl p-5"
							style={{
								background: "var(--bg-secondary)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							<div className="mb-3.5 text-[12.5px] font-semibold text-primary">
								Keyboard shortcuts
							</div>
							<div className="flex flex-col gap-2.5">
								{[
									{ label: "Quick Switcher", keys: ["⌘", "P"] },
									{ label: "Command Palette", keys: ["⌘", "⇧", "P"] },
									{ label: "New Note", keys: ["⌘", "N"] },
									{ label: "Toggle Sidebar", keys: ["⌘", "\\"] },
									{ label: "Graph View", keys: ["⌘", "G"] },
								].map((shortcut) => (
									<div key={shortcut.label} className="flex items-center justify-between">
										<span className="text-[12.5px] text-muted-foreground">{shortcut.label}</span>
										<div className="flex items-center gap-1">
											{shortcut.keys.map((key) => (
												<Kbd key={key} className="text-[10.5px]">
													{key}
												</Kbd>
											))}
										</div>
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
