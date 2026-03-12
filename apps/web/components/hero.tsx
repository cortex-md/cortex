import { Badge, Button } from "@cortex/ui"

import EditorPreview from "@/components/editor-preview"

export default function Hero() {
	return (
		<section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-10 pt-[120px] pb-20 text-center">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="hero-bg-grain" />
				<div
					className="pointer-events-none absolute rounded-full"
					style={{
						width: "800px",
						height: "500px",
						background: "radial-gradient(ellipse, rgba(232,168,60,0.07) 0%, transparent 70%)",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -60%)",
					}}
				/>
				<div className="hero-bg-grid" />
			</div>

			<div className="relative z-10 mx-auto flex w-full max-w-[980px] flex-col items-center">
				<Badge
					className="hero-badge mb-8 border px-3 py-[5px] text-[12.5px] font-medium text-accent-light"
					style={{
						background: "rgba(232,168,60,0.10)",
						borderColor: "rgba(232,168,60,0.25)",
					}}
				>
					<span
						className="dot-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent-light"
						aria-hidden="true"
					/>
					Agora com sincronização cross-device
				</Badge>

				<h1
					className="hero-title max-w-[800px] font-editor text-ink-50"
					style={{
						fontSize: "clamp(44px, 7vw, 76px)",
						fontWeight: 700,
						lineHeight: 1.08,
						letterSpacing: "-0.03em",
					}}
				>
					Seus pensamentos,
					<br />
					<em className="not-italic text-accent">conectados.</em>
				</h1>

				<p
					className="hero-subtitle mt-5 max-w-[520px] text-[17px] text-ink-200"
					style={{ lineHeight: 1.65 }}
				>
					Um segundo cérebro que cresce com você. Escreva, conecte ideias, navegue pelo grafo do seu
					conhecimento — tudo em arquivos Markdown que são seus para sempre.
				</p>

				<div className="hero-actions mt-9 flex flex-wrap justify-center gap-3">
					<Button
						asChild
						size="lg"
						className="bg-accent px-[22px] text-[15px] font-semibold text-ink-900 hover:bg-accent-light"
					>
						<a href="#">
							<svg
								aria-hidden="true"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2.2"
								strokeLinecap="round"
							>
								<path d="M12 5v14m7-7l-7 7-7-7" />
							</svg>
							Baixar para macOS
						</a>
					</Button>

					<Button
						asChild
						size="lg"
						variant="outline"
						className="border-ink-400 bg-transparent px-[22px] text-[15px] font-semibold text-ink-50 hover:border-accent hover:bg-transparent hover:text-accent"
					>
						<a href="#how">Ver demonstração</a>
					</Button>
				</div>

				<p className="hero-meta mt-[18px] text-[12.5px] text-ink-300">
					Gratuito para uso pessoal · Windows, macOS, Linux, iOS, Android
				</p>

				<div className="mt-[60px] w-full">
					<EditorPreview />
				</div>
			</div>
		</section>
	)
}
