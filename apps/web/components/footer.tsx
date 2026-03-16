const footerLinks = [
	{
		title: "Product",
		items: [
			{ label: "Download", href: "/download" },
			{ label: "Plugins", href: "#plugins" },
			{ label: "Changelog", href: "/changelog" },
		],
	},
	{
		title: "Developers",
		items: [
			{ label: "Docs", href: "/docs" },
			{ label: "GitHub", href: "https://github.com/cortexapp/cortex" },
			{ label: "Plugin API", href: "/docs/plugins" },
		],
	},
	{
		title: "Community",
		items: [
			{ label: "Discord", href: "https://discord.gg/cortex" },
			{ label: "Forum", href: "/community" },
			{ label: "Roadmap", href: "/roadmap" },
		],
	},
]

function CortexLogo() {
	return (
		<div className="flex items-center gap-2.5">
			<div
				className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center"
				style={{ background: "var(--accent)", borderRadius: "7px" }}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="3" stroke="var(--text-on-accent)" strokeWidth="1.5" />
					{[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
						<line
							key={deg}
							x1="8"
							y1="8"
							x2={8 + 6 * Math.cos((deg * Math.PI) / 180)}
							y2={8 + 6 * Math.sin((deg * Math.PI) / 180)}
							stroke="var(--text-on-accent)"
							strokeWidth="1.3"
							strokeLinecap="round"
						/>
					))}
				</svg>
			</div>
			<span className="text-[15px] font-semibold text-primary" style={{ letterSpacing: "-0.02em" }}>
				Cortex
			</span>
		</div>
	)
}

export default function Footer() {
	return (
		<footer
			className="border-t px-6"
			style={{
				borderColor: "var(--border)",
				background: "var(--bg-primary)",
				paddingTop: "52px",
				paddingBottom: "40px",
			}}
		>
			<div
				className="mx-auto max-w-[1100px]"
				style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "60px" }}
			>
				{/* Brand */}
				<div>
					<CortexLogo />
					<p
						className="mt-4 text-[13px] text-muted-foreground"
						style={{ lineHeight: 1.65, maxWidth: "180px" }}
					>
						Local-first Markdown editor. Plain files, forever yours.
					</p>
				</div>

				{/* Links */}
				<div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "32px" }}>
					{footerLinks.map((col) => (
						<div key={col.title}>
							<div
								className="mb-3.5 text-[11.5px] font-semibold uppercase text-muted-foreground"
								style={{ letterSpacing: "0.06em" }}
							>
								{col.title}
							</div>
							<ul className="flex list-none flex-col gap-2">
								{col.items.map((item) => (
									<li key={item.label}>
										<a
											href={item.href}
											className="text-[13.5px] text-muted-foreground no-underline transition-colors duration-150 hover:text-primary"
										>
											{item.label}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>

			{/* Bottom bar */}
			<div
				className="mx-auto mt-8 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 border-t pt-6"
				style={{ borderColor: "var(--border-subtle)" }}
			>
				<span className="text-[12.5px] text-muted-foreground">© 2026 Cortex.</span>
				<span className="font-mono text-[11px] text-muted-foreground">v0.1.0</span>
			</div>
		</footer>
	)
}
