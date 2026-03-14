import { Button } from "@cortex/ui"

import ScrollReveal from "@/components/scroll-reveal"

const platforms = [
	{
		label: "macOS",
		icon: (
			<svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-muted" aria-hidden="true">
				<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
			</svg>
		),
	},
	{
		label: "Windows",
		icon: (
			<svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-muted" aria-hidden="true">
				<path d="M3 5.75A2.75 2.75 0 015.75 3h12.5A2.75 2.75 0 0121 5.75v8.5A2.75 2.75 0 0118.25 17H5.75A2.75 2.75 0 013 14.25v-8.5zm1.5 0v8.5c0 .69.56 1.25 1.25 1.25h12.5c.69 0 1.25-.56 1.25-1.25v-8.5c0-.69-.56-1.25-1.25-1.25H5.75c-.69 0-1.25.56-1.25 1.25zM8 20.5h8a.75.75 0 010 1.5H8a.75.75 0 010-1.5z" />
			</svg>
		),
	},
	{
		label: "Linux",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="h-[15px] w-[15px] fill-none stroke-muted"
				strokeWidth="1.5"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 3a9 9 0 00-9 9m9-9a9 9 0 019 9m-9-9v18m9-9H3" />
			</svg>
		),
	},
	{
		label: "iOS & Android",
		icon: (
			<svg
				viewBox="0 0 24 24"
				className="h-[15px] w-[15px] fill-none stroke-muted"
				strokeWidth="1.5"
				strokeLinecap="round"
				aria-hidden="true"
			>
				<rect x="5" y="2" width="14" height="20" rx="2" />
				<circle cx="12" cy="18" r="1" />
			</svg>
		),
	},
]

export default function Cta() {
	return (
		<section className="bg-primary px-10 py-[120px] text-center">
			<ScrollReveal className="mx-auto max-w-[600px]">
				<h2
					className="mb-[18px] font-editor font-bold text-primary"
					style={{
						fontSize: "clamp(32px, 5vw, 52px)",
						lineHeight: 1.12,
						letterSpacing: "-0.03em",
					}}
				>
					Comece a construir
					<br />
					seu segundo cérebro hoje.
				</h2>

				<p className="mb-9 text-[16px] text-muted" style={{ lineHeight: 1.65 }}>
					Gratuito para sempre para uso pessoal. Sem cartão de crédito. Seus dados nunca saem do seu
					dispositivo.
				</p>

				<div className="flex flex-wrap justify-center gap-3">
					<Button
						asChild
						size="lg"
						className="rounded-[10px] bg-accent px-[22px] text-[15px] font-semibold text-primary-foreground hover:bg-accent/90"
					>
						<a href="/download">Baixar o Cortex</a>
					</Button>
					<Button
						asChild
						variant="outline"
						size="lg"
						className="rounded-[10px] border-border bg-transparent px-[22px] text-[15px] font-semibold text-primary hover:border-accent hover:bg-secondary hover:text-accent"
					>
						<a href="/docs">Ver a documentação</a>
					</Button>
				</div>

				<div className="mt-6 flex flex-wrap items-center justify-center gap-5">
					{platforms.map((platform) => (
						<div
							key={platform.label}
							className="flex items-center gap-1.5 text-[12.5px] text-muted"
						>
							{platform.icon}
							{platform.label}
						</div>
					))}
				</div>
			</ScrollReveal>
		</section>
	)
}
