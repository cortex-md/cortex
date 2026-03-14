import ScrollReveal from "@/components/scroll-reveal"

const testimonials = [
	{
		quote:
			"Depois de dois anos usando o Cortex, meu vault virou a extensão mais valiosa do meu cérebro. Abro uma nota de 2022 e todo o contexto está lá, conectado.",
		initial: "R",
		name: "Rafael Mendes",
		role: "Engenheiro de Software · São Paulo",
	},
	{
		quote:
			"Para pesquisa acadêmica, o Graph View mudou completamente como eu identifico lacunas na literatura. Consigo ver clusters de conceitos que nem sabia que existiam.",
		initial: "A",
		name: "Ana Cavalcanti",
		role: "Pesquisadora de Doutorado · UNICAMP",
	},
	{
		quote:
			"Migrei meu sistema de produtividade inteiro para o Cortex. A ideia de ter arquivos que duram décadas e que eu controlo é exatamente o que precisava.",
		initial: "L",
		name: "Lucas Ferreira",
		role: "Product Manager · Remoto",
	},
]

export default function Testimonials() {
	return (
		<section className="bg-primary py-24 px-10">
			<div className="max-w-[1100px] mx-auto">
				<ScrollReveal className="text-center max-w-[500px] mx-auto">
					<div
						className="text-[11.5px] font-semibold uppercase text-accent mb-3.5"
						style={{ letterSpacing: "0.08em" }}
					>
						06 — Depoimentos
					</div>
					<h2
						className="font-editor font-bold text-primary"
						style={{
							fontSize: "clamp(28px, 4vw, 42px)",
							lineHeight: 1.15,
							letterSpacing: "-0.025em",
						}}
					>
						O que as pessoas
						<br />
						<em className="not-italic text-accent">dizem.</em>
					</h2>
				</ScrollReveal>

				<div className="grid gap-4 mt-14" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
					{testimonials.map((testimonial, index) => (
						<ScrollReveal key={testimonial.name} delay={index * 0.1}>
							<TestimonialCard {...testimonial} />
						</ScrollReveal>
					))}
				</div>
			</div>
		</section>
	)
}

function TestimonialCard({
	quote,
	initial,
	name,
	role,
}: {
	quote: string
	initial: string
	name: string
	role: string
}) {
	return (
		<div
			className="bg-primary border border-border p-7 transition-all duration-200 hover:-translate-y-[3px] hover:border-[rgba(232,168,60,0.3)] cursor-default"
			style={{ borderRadius: "14px" }}
		>
			<p
				className="font-editor italic text-muted mb-5"
				style={{ fontSize: "15.5px", lineHeight: 1.65 }}
			>
				"{quote}"
			</p>
			<div className="flex items-center gap-2.5">
				<div className="w-[34px] h-[34px] rounded-full bg-secondary border border-border flex items-center justify-center text-[13px] font-semibold text-accent flex-shrink-0">
					{initial}
				</div>
				<div>
					<div className="text-[13.5px] font-semibold text-primary">{name}</div>
					<div className="text-[12px] text-muted">{role}</div>
				</div>
			</div>
		</div>
	)
}
