"use client"

import { Badge } from "@cortex/ui"
import { useState } from "react"

interface SyncPillar {
	icon: React.ReactNode
	title: string
	description: string
	badge?: string
}

function LockIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
			<path
				d="M7 11V7a5 5 0 0110 0v4"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
			<circle cx="12" cy="16" r="1.5" fill="currentColor" />
		</svg>
	)
}

function ServerIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<rect x="2" y="3" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
			<rect x="2" y="14" width="20" height="7" rx="2" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="6" cy="6.5" r="1" fill="currentColor" />
			<circle cx="6" cy="17.5" r="1" fill="currentColor" />
		</svg>
	)
}

function DatabaseIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<ellipse cx="12" cy="5" rx="9" ry="3" stroke="currentColor" strokeWidth="1.8" />
			<path d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" stroke="currentColor" strokeWidth="1.8" />
			<path d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" stroke="currentColor" strokeWidth="1.8" />
		</svg>
	)
}

function GitMergeIcon() {
	return (
		<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
			<circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="6" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<circle cx="18" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
			<path d="M6 8.5v7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
			<path
				d="M6 8.5C6 12 10 12.5 15.5 11"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
			/>
		</svg>
	)
}

const pillars: SyncPillar[] = [
	{
		icon: <LockIcon />,
		title: "End-to-end encrypted",
		description:
			"Your notes are encrypted on-device before they ever leave your machine. The server sees only ciphertext — not even we can read your vault.",
		badge: "AES-256-GCM",
	},
	{
		icon: <ServerIcon />,
		title: "Self-hostable",
		description:
			"Run the sync server yourself with a single Docker command. Use our hosted service or point Cortex at your own instance — it's your infrastructure.",
		badge: "Docker-ready",
	},
	{
		icon: <DatabaseIcon />,
		title: "Local-first",
		description:
			"Everything works offline. Your files live on disk as plain Markdown. Sync is additive — it never replaces or locks your local data.",
	},
	{
		icon: <GitMergeIcon />,
		title: "Conflict resolution",
		description:
			"Three-way merge via diff-match-patch handles concurrent edits gracefully. When conflicts can't be auto-resolved, Cortex shows both versions side by side.",
		badge: "Open protocol",
	},
]

function SyncStatusMock() {
	const [syncing, setSyncing] = useState(false)

	function toggleSync() {
		setSyncing(true)
		setTimeout(() => setSyncing(false), 1800)
	}

	return (
		<div
			className="overflow-hidden rounded-xl"
			style={{
				background: "var(--bg-primary)",
				border: "1px solid var(--border)",
				boxShadow: "0 12px 32px rgba(0,0,0,0.12)",
			}}
		>
			{/* Header */}
			<div
				className="flex items-center gap-3 px-4 py-3"
				style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--border-subtle)" }}
			>
				<div className="flex items-center gap-[6px]">
					<div className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
					<div className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
					<div className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
				</div>
				<span className="flex-1 text-center font-mono text-[10.5px] text-muted-foreground">
					Sync — Cortex
				</span>
			</div>

			{/* Sync status */}
			<div className="px-5 py-5">
				<div className="mb-4 flex items-center justify-between">
					<span className="text-[13px] font-semibold text-primary">Vault sync status</span>
					<button
						type="button"
						onClick={toggleSync}
						className="rounded-md px-3 py-1 text-[11.5px] font-medium transition-colors duration-150"
						style={{
							background: "var(--accent-subtle)",
							color: "var(--accent-text)",
							border: "1px solid var(--accent-border)",
						}}
					>
						{syncing ? "Syncing…" : "Sync now"}
					</button>
				</div>

				{/* Devices */}
				<div className="flex flex-col gap-2.5">
					{[
						{ name: "MacBook Pro", status: syncing ? "syncing" : "synced", time: "now" },
						{ name: "iPhone 15", status: "synced", time: "2 min ago" },
						{ name: "iPad Pro", status: "synced", time: "14 min ago" },
					].map((device) => (
						<div
							key={device.name}
							className="flex items-center justify-between rounded-lg px-3 py-2.5"
							style={{
								background: "var(--bg-secondary)",
								border: "1px solid var(--border-subtle)",
							}}
						>
							<div className="flex items-center gap-2.5">
								<span
									className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
									style={{
										background:
											device.status === "syncing"
												? "var(--status-warning)"
												: "var(--status-success)",
									}}
								/>
								<span className="text-[12.5px] font-medium text-primary">{device.name}</span>
							</div>
							<span className="text-[11px] text-muted-foreground">{device.time}</span>
						</div>
					))}
				</div>

				{/* E2EE badge */}
				<div
					className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5"
					style={{
						background: "var(--bg-secondary)",
						border: "1px solid var(--border-subtle)",
					}}
				>
					<span style={{ color: "var(--status-success)" }}>
						<LockIcon />
					</span>
					<div>
						<div className="text-[11.5px] font-medium text-primary">End-to-end encrypted</div>
						<div className="text-[10.5px] text-muted-foreground">Keys never leave your device</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default function SyncSection() {
	return (
		<section
			id="sync"
			className="overflow-hidden px-6 py-24"
			style={{ background: "var(--bg-secondary)" }}
		>
			<div className="mx-auto max-w-[1100px]">
				<div className="grid items-center gap-16" style={{ gridTemplateColumns: "1fr 1fr" }}>
					{/* Left: pillars */}
					<div>
						<div
							className="mb-3.5 text-[11.5px] font-semibold uppercase"
							style={{ letterSpacing: "0.08em", color: "var(--accent)" }}
						>
							04 — Sync
						</div>
						<h2
							className="mb-5 font-editor font-bold text-primary"
							style={{
								fontSize: "clamp(28px, 4vw, 44px)",
								lineHeight: 1.12,
								letterSpacing: "-0.025em",
							}}
						>
							Your data,{" "}
							<em className="not-italic" style={{ color: "var(--accent)" }}>
								your rules.
							</em>
						</h2>
						<p
							className="mb-10 text-muted-foreground"
							style={{ fontSize: "16px", lineHeight: 1.7, maxWidth: "440px" }}
						>
							Sync built for people who care about privacy and control. No proprietary lock-in, no
							cloud dependency you can't replace.
						</p>

						<div className="flex flex-col gap-5">
							{pillars.map((pillar) => (
								<div key={pillar.title} className="flex items-start gap-4">
									<div
										className="flex-shrink-0 rounded-lg p-2.5"
										style={{
											background: "var(--bg-elevated)",
											border: "1px solid var(--border-subtle)",
											color: "var(--accent)",
										}}
									>
										{pillar.icon}
									</div>
									<div>
										<div className="mb-1 flex items-center gap-2">
											<span className="text-[13.5px] font-semibold text-primary">
												{pillar.title}
											</span>
											{pillar.badge && (
												<Badge
													className="px-2 py-0.5 text-[10px] font-medium"
													style={{
														background: "var(--accent-subtle)",
														color: "var(--accent-text)",
														border: "1px solid var(--accent-border)",
													}}
												>
													{pillar.badge}
												</Badge>
											)}
										</div>
										<p className="text-[13px] text-muted-foreground" style={{ lineHeight: 1.65 }}>
											{pillar.description}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Right: sync status mock */}
					<div>
						<SyncStatusMock />
					</div>
				</div>
			</div>
		</section>
	)
}
