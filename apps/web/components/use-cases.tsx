"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@cortex/ui"

type CaseId = "researcher" | "dev" | "student" | "writer"

interface CaseTab {
	id: CaseId
	label: string
}

interface CaseContentData {
	id: CaseId
	title: string
	description: string
	points: string[]
	renderMock: () => React.ReactNode
}

const caseTabs: CaseTab[] = [
	{ id: "researcher", label: "Pesquisadores" },
	{ id: "dev", label: "Desenvolvedores" },
	{ id: "student", label: "Estudantes" },
	{ id: "writer", label: "Escritores" },
]

const caseContentList: CaseContentData[] = [
	{
		id: "researcher",
		title: "Conecte literatura, dados e hipóteses",
		description:
			"Pesquisadores usam o Cortex como repositório de conhecimento científico — importando referências, anotando artigos e visualizando como conceitos se relacionam entre domínios diferentes.",
		points: [
			"Importe PDFs e anote diretamente no documento com links para suas notas",
			"Use o plugin Zotero para sincronizar referências bibliográficas automaticamente",
			"Crie mapas conceituais com o Graph View para identificar lacunas na literatura",
			"Conecte observações de campo a teorias e referências com wikilinks",
		],
		renderMock: () => <ResearcherMock />,
	},
	{
		id: "dev",
		title: "Seu devlog, arquitetura e decisões num só lugar",
		description:
			"Desenvolvedores usam o Cortex como externalização da memória técnica: decisões de arquitetura, snippets, runbooks e retrospectivas, todos conectados e pesquisáveis.",
		points: [
			"ADRs (Architecture Decision Records) vinculados ao contexto do projeto",
			"Snippets de código com highlight de sintaxe e links para a documentação",
			"Runbooks de incidentes conectados às notas de post-mortem",
			"Journal diário de desenvolvimento com tags por feature e sprint",
		],
		renderMock: () => <DevlogMock />,
	},
	{
		id: "student",
		title: "Aprenda conectando, não decorando",
		description:
			"Estudantes que usam o Cortex constroem uma base de conhecimento incremental — cada disciplina conectada às outras, facilitando revisões e tornando o aprendizado cumulativo e duradouro.",
		points: [
			"Notas de aula vinculadas ao livro texto e exercícios resolvidos",
			"Mapas de conceito por disciplina visualizados no Graph View",
			"Templates de revisão espaçada com datas automáticas",
			'Conexões entre disciplinas para aprender o "por quê" por trás dos conteúdos',
		],
		renderMock: () => <StudentMock />,
	},
	{
		id: "writer",
		title: "Da pesquisa ao rascunho final",
		description:
			"Escritores usam o Cortex como caderno de criação não-linear — coletando referências, desenvolvendo personagens, estruturando narrativas e mantendo consistência de worldbuilding com links automáticos.",
		points: [
			"Notas de personagem, localizações e eventos todos conectados entre si",
			"Linha do tempo narrativa construída com links bidirecionais",
			"Pesquisa histórica ou científica vinculada diretamente às cenas",
			"Rascunhos versionados com histórico de snapshots local",
		],
		renderMock: () => <WriterMock />,
	},
]

const devlogEntries = [
	{
		id: "2025-03-11-0942",
		date: "2025-03-11 · 09:42",
		content: (
			<>
				Mudei a estratégia de cache do <WikiLink>Redis Layer</WikiLink> para LRU. Ver{" "}
				<WikiLink>ADR-014</WikiLink> para justificativa.
			</>
		),
		tags: ["#performance", "#infra"],
	},
	{
		id: "2025-03-10-1615",
		date: "2025-03-10 · 16:15",
		content: (
			<>
				Bug no pipeline de <WikiLink>CI/CD</WikiLink> — variável de env não propagando no step de
				build. Corrigido, doc em <WikiLink>Runbook - CI Issues</WikiLink>.
			</>
		),
		tags: ["#bugfix", "#devops"],
	},
	{
		id: "2025-03-10-1000",
		date: "2025-03-10 · 10:00",
		content: (
			<>
				Sprint planning feito. Backlog atualizado em <WikiLink>Sprint 08 Planning</WikiLink>. Foco
				em auth refactor esta semana.
			</>
		),
		tags: ["#planejamento"],
	},
]

const studyCards = [
	{
		title: "Algoritmos e Estruturas de Dados",
		links: [
			"Busca Binária — complexidade O(log n)",
			"Árvores AVL → conecta a Bancos de Dados",
			"Grafos → ver Redes de Computadores",
		],
	},
	{
		title: "Redes de Computadores",
		links: ["TCP/IP Stack — protocolo por camada", "Algoritmos de roteamento → Grafos"],
	},
]

export default function UseCases() {
	return (
		<section className="bg-primary px-6 py-24 md:px-10" id="cases">
			<div className="mx-auto max-w-[1100px]">
				<div className="reveal">
					<div
						className="mb-3.5 text-[11.5px] font-semibold text-accent uppercase"
						style={{ letterSpacing: "0.08em" }}
					>
						03 — Casos de uso
					</div>
					<h2
						className="font-editor text-primary font-bold"
						style={{
							fontSize: "clamp(28px, 4vw, 42px)",
							lineHeight: 1.15,
							letterSpacing: "-0.025em",
						}}
					>
						Para cada tipo
						<br />
						<em className="text-accent not-italic">de mente.</em>
					</h2>
				</div>

				<Tabs defaultValue="researcher" className="mt-12 gap-8">
					<TabsList
						className="h-auto w-fit flex-wrap border border-border bg-elevated p-1"
						style={{ borderRadius: "var(--radius-lg)" }}
					>
						{caseTabs.map((tab) => (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="h-auto px-[18px] py-[7px] font-ui text-[13.5px] data-[state=active]:bg-secondary data-[state=active]:text-primary"
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>

					{caseContentList.map((caseContent) => (
						<TabsContent key={caseContent.id} value={caseContent.id} className="outline-none">
							<div className="grid items-center gap-12 md:grid-cols-2">
								<CaseText
									title={caseContent.title}
									description={caseContent.description}
									points={caseContent.points}
								/>
								{caseContent.renderMock()}
							</div>
						</TabsContent>
					))}
				</Tabs>
			</div>
		</section>
	)
}

function CaseText({
	title,
	description,
	points,
}: {
	title: string
	description: string
	points: string[]
}) {
	return (
		<div>
			<div
				className="mb-3.5 font-editor text-primary font-bold"
				style={{ fontSize: "26px", letterSpacing: "-0.02em", lineHeight: 1.25 }}
			>
				{title}
			</div>
			<p className="mb-6 text-[15px] text-muted" style={{ lineHeight: 1.7 }}>
				{description}
			</p>
			<ul className="flex list-none flex-col gap-2.5">
				{points.map((point) => (
					<li key={point} className="flex items-start gap-2.5 text-[13.5px] text-muted">
						<span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-accent" />
						{point}
					</li>
				))}
			</ul>
		</div>
	)
}

function MockWindow({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div
			className="overflow-hidden border border-border bg-elevated"
			style={{
				borderRadius: "14px",
				boxShadow: "0 20px 25px rgba(0,0,0,.40), 0 10px 10px rgba(0,0,0,.28)",
			}}
		>
			<div className="flex h-[38px] items-center gap-2.5 border-b border-border bg-secondary px-3.5">
				<div className="flex gap-[5px]">
					<div className="h-[9px] w-[9px] rounded-full" style={{ background: "#FF5F57" }} />
					<div className="h-[9px] w-[9px] rounded-full" style={{ background: "#FFBC2E" }} />
					<div className="h-[9px] w-[9px] rounded-full" style={{ background: "#28C840" }} />
				</div>
				<span className="ml-2 text-[12px] text-muted">{title}</span>
			</div>
			<div className="p-5">{children}</div>
		</div>
	)
}

function ResearcherMock() {
	return (
		<MockWindow title="Hipótese — Redes Complexas.md">
			<div className="relative overflow-hidden" style={{ height: "220px" }}>
				<svg
					style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
					viewBox="0 0 400 220"
					aria-hidden="true"
				>
					<line x1="200" y1="110" x2="90" y2="50" stroke="#414040" strokeWidth="1" />
					<line x1="200" y1="110" x2="320" y2="60" stroke="#414040" strokeWidth="1" />
					<line x1="200" y1="110" x2="330" y2="160" stroke="#414040" strokeWidth="1" />
					<line x1="200" y1="110" x2="80" y2="170" stroke="#414040" strokeWidth="1" />
					<line x1="200" y1="110" x2="200" y2="190" stroke="#414040" strokeWidth="1" />
					<line x1="90" y1="50" x2="40" y2="90" stroke="#2C2B2A" strokeWidth="1" />
					<line x1="320" y1="60" x2="370" y2="100" stroke="#2C2B2A" strokeWidth="1" />
					<circle
						cx="200"
						cy="110"
						r="22"
						fill="rgba(232,168,60,0.12)"
						stroke="#E8A83C"
						strokeWidth="1.5"
					/>
					<circle
						cx="90"
						cy="50"
						r="14"
						fill="rgba(65,64,64,0.8)"
						stroke="#414040"
						strokeWidth="1"
					/>
					<circle
						cx="320"
						cy="60"
						r="14"
						fill="rgba(65,64,64,0.8)"
						stroke="#414040"
						strokeWidth="1"
					/>
					<circle
						cx="330"
						cy="160"
						r="12"
						fill="rgba(65,64,64,0.8)"
						stroke="#414040"
						strokeWidth="1"
					/>
					<circle
						cx="80"
						cy="170"
						r="12"
						fill="rgba(65,64,64,0.8)"
						stroke="#414040"
						strokeWidth="1"
					/>
					<circle
						cx="200"
						cy="190"
						r="10"
						fill="rgba(65,64,64,0.8)"
						stroke="#414040"
						strokeWidth="1"
					/>
					<circle
						cx="40"
						cy="90"
						r="8"
						fill="rgba(44,43,42,0.8)"
						stroke="#2C2B2A"
						strokeWidth="1"
					/>
					<circle
						cx="370"
						cy="100"
						r="8"
						fill="rgba(44,43,42,0.8)"
						stroke="#2C2B2A"
						strokeWidth="1"
					/>
					<text
						x="200"
						y="114"
						textAnchor="middle"
						fontSize="9"
						fill="#E8A83C"
						style={{ fontFamily: "var(--font-ui)" }}
					>
						Hipótese A
					</text>
					<text x="90" y="54" textAnchor="middle" fontSize="8" fill="#9E9C99">
						Barabási 2002
					</text>
					<text x="320" y="64" textAnchor="middle" fontSize="8" fill="#9E9C99">
						Watts 1998
					</text>
					<text x="330" y="164" textAnchor="middle" fontSize="8" fill="#9E9C99">
						Dados campo
					</text>
					<text x="80" y="174" textAnchor="middle" fontSize="8" fill="#9E9C99">
						Observação 3
					</text>
					<text x="200" y="194" textAnchor="middle" fontSize="8" fill="#9E9C99">
						Metodologia
					</text>
				</svg>
			</div>
		</MockWindow>
	)
}

function DevlogTag({ children }: { children: React.ReactNode }) {
	return (
		<span
			className="mt-1.5 mr-1 inline-block px-[7px] py-0.5 font-mono text-[11px] text-accent"
			style={{
				background: "rgba(232,168,60,0.10)",
				borderRadius: "9999px",
				border: "1px solid rgba(232,168,60,0.18)",
			}}
		>
			{children}
		</span>
	)
}

function WikiLink({ children }: { children: React.ReactNode }) {
	return <span className="cursor-pointer text-accent">[[{children}]]</span>
}

function DevlogMock() {
	return (
		<MockWindow title="devlog / 2025-03-11.md">
			<div>
				{devlogEntries.map((entry) => (
					<div key={entry.id} className="border-b border-border py-3.5 last:border-b-0">
						<div className="mb-1 font-mono text-[11px] text-muted">{entry.date}</div>
						<div className="text-[13.5px] text-muted" style={{ lineHeight: 1.55 }}>
							{entry.content}
						</div>
						<div>
							{entry.tags.map((tag) => (
								<DevlogTag key={tag}>{tag}</DevlogTag>
							))}
						</div>
					</div>
				))}
			</div>
		</MockWindow>
	)
}

function StudentMock() {
	return (
		<MockWindow title="Mapa de Estudo — Computação">
			<div>
				{studyCards.map((card) => (
					<div
						key={card.title}
						className="mb-2.5 border border-border bg-secondary p-3 last:mb-0"
						style={{ borderRadius: "var(--radius-md)" }}
					>
						<div className="mb-1.5 text-[13px] font-semibold text-primary">{card.title}</div>
						<div className="flex flex-col gap-1">
							{card.links.map((link) => (
								<a
									key={link}
									href="#"
									className="flex items-center gap-[5px] text-[12px] text-accent no-underline"
								>
									<span className="text-[11px]">→</span>
									{link}
								</a>
							))}
						</div>
					</div>
				))}
			</div>
		</MockWindow>
	)
}

function WriterMock() {
	return (
		<MockWindow title="Personagem — Elena Voss.md">
			<div className="font-editor text-[13.5px] text-muted" style={{ lineHeight: 1.7 }}>
				<p className="mb-2.5">
					Elena aparece pela primeira vez no <WikiLink>Capítulo 3 — O Trem</WikiLink>. Sua motivação
					central está em <WikiLink>Backstory — Guerra de 2041</WikiLink>.
				</p>
				<p className="mb-2.5">
					Conflito principal com <WikiLink>Personagem — Marcus</WikiLink> se resolve no{" "}
					<WikiLink>Ato III</WikiLink>. Referência histórica em{" "}
					<WikiLink>Pesquisa — Resistência Polonesa</WikiLink>.
				</p>
				<div
					className="font-editor text-[13px] italic text-muted"
					style={{
						background: "rgba(232,168,60,0.05)",
						borderLeft: "2px solid var(--accent)",
						padding: "8px 12px",
						borderRadius: "0 4px 4px 0",
					}}
				>
					"Armas não ganham guerras. Memória, sim."
				</div>
			</div>
		</MockWindow>
	)
}
