export function CortexLogo() {
	return (
		<a href="/" className="flex items-center gap-2.5 text-primary no-underline">
			<div
				className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center bg-accent"
				style={{ borderRadius: "7px" }}
			>
				<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
					<circle cx="8" cy="8" r="2.5" stroke="#0A0A09" strokeWidth="1.6" />
					<path
						d="M8 2.5L8 1M8 15L8 13.5M2.5 8H1M15 8H13.5M4.22 4.22L3.16 3.16M12.84 12.84L11.78 11.78M11.78 4.22L12.84 3.16M3.16 12.84L4.22 11.78"
						stroke="#0A0A09"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				</svg>
			</div>
			<span className="text-[15px] font-semibold text-primary" style={{ letterSpacing: "-0.02em" }}>
				Cortex
			</span>
		</a>
	)
}
