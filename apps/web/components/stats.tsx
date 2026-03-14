import ScrollReveal from "@/components/scroll-reveal"

const stats = [
	{
		numParts: [
			{ text: "1", accent: false },
			{ text: "M", accent: true },
			{ text: "+", accent: false },
		],
		label: "usuários ativos em mais de 180 países",
	},
	{
		numParts: [
			{ text: "1", accent: false },
			{ text: ",", accent: true },
			{ text: "400+", accent: false },
		],
		label: "plugins criados pela comunidade open source",
	},
	{
		numParts: [{ text: "∞", accent: false }],
		label: "notas suportadas — sem limite de vault",
	},
	{
		numParts: [{ text: "0", accent: true }],
		label: "acesso a seus dados por terceiros — sempre",
	},
]

export default function Stats() {
	return (
		<section className="bg-primary py-24 px-10" id="pricing">
			<div className="max-w-[1100px] mx-auto">
				<ScrollReveal className="text-center max-w-[500px] mx-auto">
					<div
						className="text-[11.5px] font-semibold uppercase text-accent mb-3.5"
						style={{ letterSpacing: "0.08em" }}
					>
						05 — Comunidade
					</div>
					<h2
						className="font-editor font-bold text-primary mb-4"
						style={{
							fontSize: "clamp(28px, 4vw, 42px)",
							lineHeight: 1.15,
							letterSpacing: "-0.025em",
						}}
					>
						Milhões constroem
						<br />
						<em className="not-italic text-accent">seus segundos cérebros.</em>
					</h2>
				</ScrollReveal>

				<div
					className="grid bg-secondary border border-border overflow-hidden mt-16"
					style={{
						gridTemplateColumns: "repeat(4, 1fr)",
						gap: "1px",
						borderRadius: "14px",
					}}
				>
					{stats.map((stat, index) => (
						<ScrollReveal
							key={index}
							delay={index * 0.1}
							className="bg-primary hover:bg-secondary transition-colors duration-200"
						>
							<div style={{ padding: "36px 28px" }}>
								<div
									className="font-editor font-bold text-primary mb-2"
									style={{
										fontSize: "42px",
										letterSpacing: "-0.04em",
										lineHeight: 1,
									}}
								>
									{stat.numParts.map((part, i) => (
										<span key={i} className={part.accent ? "text-accent" : ""}>
											{part.text}
										</span>
									))}
								</div>
								<div className="text-[13.5px] text-muted" style={{ lineHeight: 1.45 }}>
									{stat.label}
								</div>
							</div>
						</ScrollReveal>
					))}
				</div>
			</div>
		</section>
	)
}
