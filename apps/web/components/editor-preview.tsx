export default function EditorPreview() {
	return (
		<div className="hero-preview mx-auto w-full max-w-[900px]">
			<div
				className="relative overflow-hidden border border-border bg-elevated"
				style={{
					borderRadius: "14px",
					boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
				}}
			>
				<div className="flex h-[42px] items-center gap-3.5 border-b border-border bg-secondary px-4">
					<div className="flex gap-1.5">
						<div className="h-[11px] w-[11px] rounded-full" style={{ background: "#FF5F57" }} />
						<div className="h-[11px] w-[11px] rounded-full" style={{ background: "#FFBC2E" }} />
						<div className="h-[11px] w-[11px] rounded-full" style={{ background: "#28C840" }} />
					</div>

					<div className="flex flex-1 gap-0.5 pl-2">
						{[
							{ label: "Projeto Alpha.md", active: true },
							{ label: "Reunião 2025-03.md", active: false },
							{ label: "Leituras Q1.md", active: false },
						].map((tab) => (
							<div
								key={tab.label}
								className={`relative top-px border border-b-0 px-3 py-1 text-[12px] transition-all duration-150 ${
									tab.active
										? "border-border bg-elevated text-primary"
										: "border-transparent text-muted"
								}`}
								style={{ borderRadius: "var(--radius-md) var(--radius-md) 0 0" }}
							>
								{tab.active && (
									<span
										className="absolute right-0 bottom-0 left-0 h-0.5 bg-accent"
										style={{ borderRadius: "2px 2px 0 0" }}
									/>
								)}
								{tab.label}
							</div>
						))}
					</div>
				</div>

				<div className="grid min-h-[380px]" style={{ gridTemplateColumns: "220px 1fr" }}>
					<div className="hidden overflow-hidden border-r border-border bg-elevated py-3.5 md:block">
						<SidebarSection title="Vault">
							{[
								{ label: "Projeto Alpha.md", active: true },
								{ label: "Reunião 2025-03.md", active: false },
								{ label: "Leituras Q1.md", active: false },
							].map((item) => (
								<SidebarItem key={item.label} active={item.active}>
									<FileIcon />
									{item.label}
								</SidebarItem>
							))}
						</SidebarSection>

						<SidebarSection title="Tags" className="mt-3">
							{["#trabalho", "#pesquisa", "#leituras"].map((tag) => (
								<SidebarItem key={tag}>
									<TagIcon />
									{tag}
								</SidebarItem>
							))}
						</SidebarSection>
					</div>

					<div className="relative overflow-hidden px-10 py-8 font-editor text-[15px] leading-[1.8] text-muted">
						<div
							className="mb-[18px] font-ui text-[26px] font-semibold text-primary"
							style={{ letterSpacing: "-0.025em" }}
						>
							Projeto Alpha — Visão Geral
						</div>

						<p className="mb-3.5 text-[14.5px] text-muted">
							Este projeto se originou das conversas em <WikiLink>Reunião 2025-03</WikiLink> sobre
							restruturar o fluxo de entrega. As dependências principais estão documentadas em{" "}
							<WikiLink>Stack Técnica</WikiLink>.
						</p>

						<blockquote
							className="my-4 font-editor text-[14px] text-muted italic"
							style={{
								borderLeft: "3px solid var(--accent)",
								background: "rgba(232,168,60,0.05)",
								padding: "10px 16px",
								borderRadius: "0 var(--radius-md) var(--radius-md) 0",
							}}
						>
							"A complexidade não é o problema — é a falta de conexões visíveis entre as partes." —
							Nota de <WikiLink>Arquitetura de Sistemas</WikiLink>
						</blockquote>

						<p className="mb-3.5 text-[14.5px] text-muted">
							Próximas ações: checklist de entregáveis em <WikiLink>Sprint 07</WikiLink>.
							Referências de leitura em <WikiLink>Leituras Q1</WikiLink>.
						</p>

						<p className="text-[14.5px]">
							<EditorTag>#trabalho</EditorTag>
							<EditorTag className="ml-1.5">#pesquisa</EditorTag>
							<span className="cursor-blink ml-px inline-block h-[1.1em] w-0.5 align-text-bottom bg-accent" />
						</p>

						<div
							className="absolute top-8 right-4 w-[180px] border border-border bg-secondary p-3 font-ui"
							style={{ borderRadius: "var(--radius-lg)" }}
						>
							<div
								className="mb-2.5 text-[10.5px] font-semibold text-muted uppercase"
								style={{ letterSpacing: "0.07em" }}
							>
								Backlinks (4)
							</div>
							{["Reunião 2025-03", "Stack Técnica", "Sprint 07", "Leituras Q1"].map((link) => (
								<a
									key={link}
									href="/"
									className="block rounded-md px-1.5 py-[5px] text-[12.5px] text-accent-light no-underline transition-colors duration-100 hover:bg-secondary"
								>
									<span className="flex items-center gap-1.5">
										<FileIconSm />
										{link}
									</span>
								</a>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function SidebarSection({
	title,
	children,
	className = "",
}: {
	title: string
	children: React.ReactNode
	className?: string
}) {
	return (
		<div className={`px-3 pt-1.5 pb-0.5 ${className}`}>
			<div
				className="px-1.5 pb-1.5 text-[10.5px] font-semibold text-muted uppercase"
				style={{ letterSpacing: "0.07em" }}
			>
				{title}
			</div>
			{children}
		</div>
	)
}

function SidebarItem({
	children,
	active = false,
}: {
	children: React.ReactNode
	active?: boolean
}) {
	return (
		<div
			className={`my-px flex items-center gap-2 rounded-md px-2.5 py-[5px] text-[13px] transition-all duration-100 ${
				active
					? "bg-[rgba(232,168,60,0.12)] text-accent-light"
					: "text-muted hover:bg-secondary hover:text-primary"
			}`}
		>
			{children}
		</div>
	)
}

function WikiLink({ children }: { children: React.ReactNode }) {
	return (
		<span
			className="cursor-pointer text-accent-light"
			style={{
				textDecoration: "underline",
				textDecorationColor: "rgba(232,168,60,0.3)",
			}}
		>
			[[{children}]]
		</span>
	)
}

function EditorTag({
	children,
	className = "",
}: {
	children: React.ReactNode
	className?: string
}) {
	return (
		<span
			className={`inline-block px-2 py-0.5 font-mono text-[12px] text-accent-light ${className}`}
			style={{
				background: "rgba(232,168,60,0.12)",
				borderRadius: "9999px",
				border: "1px solid rgba(232,168,60,0.2)",
			}}
		>
			{children}
		</span>
	)
}

function FileIcon() {
	return (
		<svg
			className="h-3.5 w-3.5 flex-shrink-0 opacity-70"
			viewBox="0 0 24 24"
			stroke="currentColor"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
			<path d="M14 2v6h6" />
		</svg>
	)
}

function FileIconSm() {
	return (
		<svg
			width="12"
			height="12"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
			<path d="M14 2v6h6" />
		</svg>
	)
}

function TagIcon() {
	return (
		<svg
			className="h-3.5 w-3.5 flex-shrink-0 opacity-70"
			viewBox="0 0 24 24"
			stroke="currentColor"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			aria-hidden="true"
		>
			<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
			<circle cx="7" cy="7" r="1" />
		</svg>
	)
}
