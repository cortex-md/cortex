const footerColumns = [
	{
		title: "Produto",
		links: ["Download", "Plugins", "Temas", "Sync", "Changelog"],
	},
	{
		title: "Recursos",
		links: ["Documentação", "Guia de início", "Templates", "Fórum", "Blog"],
	},
	{
		title: "Empresa",
		links: ["Roadmap", "Comunidade", "Contato"],
	},
]

export default function Footer() {
	return (
		<footer className="bg-primary border-t border-border" style={{ padding: "48px 40px" }}>
			<div
				className="max-w-[1100px] mx-auto"
				style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "60px" }}
			>
				<div>
					<div className="flex items-center gap-2.5 mb-3">
						<div
							className="w-[26px] h-[26px] flex items-center justify-center flex-shrink-0 bg-accent"
							style={{ borderRadius: "7px" }}
						>
							<svg width="14" height="14" viewBox="0 0 16 16" fill="none">
								<path
									d="M3 2h10a1 1 0 011 1v2H2V3a1 1 0 011-1zm-1 5h12v6a1 1 0 01-1 1H4a1 1 0 01-1-1V7zm4 2v4m2-4v4m2-4v4"
									stroke="#0A0A09"
									strokeWidth="1.6"
									strokeLinecap="round"
								/>
							</svg>
						</div>
						<span
							className="text-[15px] font-semibold text-primary"
							style={{ letterSpacing: "-0.02em" }}
						>
							Cortex
						</span>
					</div>
					<p className="text-[13px] text-muted" style={{ lineHeight: 1.65, marginTop: "12px" }}>
						Um segundo cérebro construído para durar. Markdown puro, local-first, seus dados são
						seus.
					</p>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "32px" }}>
					{footerColumns.map((col) => (
						<div key={col.title}>
							<div
								className="text-[12px] font-semibold uppercase text-muted mb-3.5"
								style={{ letterSpacing: "0.06em" }}
							>
								{col.title}
							</div>
							<ul className="list-none flex flex-col gap-2">
								{col.links.map((link) => (
									<li key={link}>
										<a
											href="#"
											className="text-[13.5px] text-muted no-underline transition-colors duration-150 hover:text-primary"
										>
											{link}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>

			<div className="max-w-[1100px] mx-auto mt-8 pt-6 border-t border-border flex justify-between items-center flex-wrap gap-3">
				<span className="text-[12.5px] text-muted">© 2025 Cortex.</span>
				<span className="font-mono text-[11px] text-muted">v0.1.0</span>
			</div>
		</footer>
	)
}
