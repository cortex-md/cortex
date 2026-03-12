import ScrollReveal from "@/components/scroll-reveal"

const features = [
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
				<polyline points="13 2 13 9 20 9" />
			</svg>
		),
		name: "Markdown nativo",
		desc: "Seus arquivos são arquivos reais. Sem banco de dados proprietário. Edite com qualquer editor, sincronize com qualquer ferramenta, e acesse daqui a 30 anos.",
	},
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="12" cy="12" r="2" />
				<circle cx="4" cy="6" r="2" />
				<circle cx="20" cy="6" r="2" />
				<circle cx="4" cy="18" r="2" />
				<circle cx="20" cy="18" r="2" />
				<line x1="6" y1="7" x2="10" y2="11" />
				<line x1="14" y1="11" x2="18" y2="7" />
				<line x1="6" y1="17" x2="10" y2="13" />
				<line x1="14" y1="13" x2="18" y2="17" />
			</svg>
		),
		name: "Links bidirecionais",
		desc: (
			<>
				Escreva{" "}
				<code
					className="font-mono text-[12px] px-[5px] py-px"
					style={{
						background: "var(--color-bg-secondary)",
						borderRadius: "3px",
					}}
				>
					[[nome da nota]]
				</code>{" "}
				e o Cortex cria uma conexão automática. Backlinks aparecem em tempo real sem nenhuma
				configuração.
			</>
		),
	},
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<circle cx="12" cy="12" r="10" />
				<circle cx="12" cy="12" r="4" />
				<line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
				<line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
				<line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
				<line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
			</svg>
		),
		name: "Graph View",
		desc: "Visualize toda a sua base de conhecimento como um mapa interativo. Descubra conexões que você não sabia que existiam e navegue pelo contexto de qualquer nota.",
	},
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<rect x="3" y="3" width="7" height="7" />
				<rect x="14" y="3" width="7" height="7" />
				<rect x="14" y="14" width="7" height="7" />
				<rect x="3" y="14" width="7" height="7" />
			</svg>
		),
		name: "Plugins & extensões",
		desc: "Mais de 1.400 plugins da comunidade. Calendários, Kanban, LaTeX, Dataview para consultas em suas notas, e muito mais. Estenda o Cortex do jeito que precisar.",
	},
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
			</svg>
		),
		name: "Local-first & privado",
		desc: "Tudo fica no seu dispositivo. Nenhuma nota passa pelos nossos servidores. A sincronização end-to-end criptografada é opcional — você decide onde seus dados ficam.",
	},
	{
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="w-[18px] h-[18px] stroke-accent fill-none"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<polyline points="16 18 22 12 16 6" />
				<polyline points="8 6 2 12 8 18" />
			</svg>
		),
		name: "Temas & personalização",
		desc: "CSS customizado, temas da comunidade, modo claro e escuro refinados. O Cortex se adapta ao seu fluxo de trabalho — não o contrário.",
	},
]

export default function Features() {
	return (
		<section className="bg-primary py-24 px-10" id="features">
			<div className="max-w-[1100px] mx-auto">
				<ScrollReveal>
					<div
						className="text-[11.5px] font-semibold uppercase text-accent mb-3.5"
						style={{ letterSpacing: "0.08em" }}
					>
						01 — Fundação
					</div>
					<h2
						className="font-editor font-bold text-primary mb-[18px]"
						style={{
							fontSize: "clamp(28px, 4vw, 42px)",
							lineHeight: 1.15,
							letterSpacing: "-0.025em",
						}}
					>
						Construído para durar.
						<br />
						<em className="not-italic text-accent">Feito para pensar.</em>
					</h2>
					<p className="text-[16px] text-muted max-w-[540px]" style={{ lineHeight: 1.7 }}>
						Markdown puro. Arquivos locais. Nenhum lock-in. Seu conhecimento é seu — e o Cortex
						garante que ele permaneça assim por décadas.
					</p>
				</ScrollReveal>

				<div
					className="grid gap-px border border-border overflow-hidden mt-16"
					style={{
						gridTemplateColumns: "repeat(3, 1fr)",
						background: "var(--color-bg-secondary)",
						borderRadius: "14px",
					}}
				>
					{features.map((feature, i) => (
						<ScrollReveal key={feature.name} delay={[0, 0.1, 0.2, 0, 0.1, 0.2][i]}>
							<FeatureCard {...feature} />
						</ScrollReveal>
					))}
				</div>
			</div>
		</section>
	)
}

function FeatureCard({
	icon,
	name,
	desc,
}: {
	icon: React.ReactNode
	name: string
	desc: React.ReactNode
}) {
	return (
		<div
			className="bg-primary p-8 transition-colors duration-200 relative overflow-hidden cursor-default group hover:bg-secondary"
			style={{ padding: "32px 28px" }}
		>
			<div
				className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
				style={{
					background:
						"radial-gradient(ellipse 200% 100% at 50% 100%, rgba(232,168,60,0.06) 0%, transparent 60%)",
				}}
			/>
			<div
				className="w-10 h-10 flex items-center justify-center mb-5 border transition-colors duration-200 group-hover:border-accent/35"
				style={{
					borderRadius: "var(--radius-lg)",
					background: "rgba(232,168,60,0.10)",
					borderColor: "rgba(232,168,60,0.20)",
				}}
			>
				{icon}
			</div>
			<div
				className="text-[15px] font-semibold text-primary mb-2"
				style={{ letterSpacing: "-0.01em" }}
			>
				{name}
			</div>
			<div className="text-[13.5px] text-muted" style={{ lineHeight: 1.65 }}>
				{desc}
			</div>
		</div>
	)
}
