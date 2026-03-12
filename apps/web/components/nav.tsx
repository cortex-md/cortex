"use client"

import { Button } from "@cortex/ui"
import { useEffect, useState } from "react"

const navigationLinks = [
	{ label: "Recursos", href: "#features" },
	{ label: "Casos de uso", href: "#cases" },
	{ label: "Graph View", href: "#graph" },
	{ label: "Preços", href: "#pricing" },
]

export default function Nav() {
	const [scrolled, setScrolled] = useState(false)

	useEffect(() => {
		function handleScroll() {
			setScrolled(window.scrollY > 60)
		}

		window.addEventListener("scroll", handleScroll, { passive: true })

		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<nav
			className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center justify-between px-6 md:px-10"
			style={{
				background: scrolled ? "rgba(17,17,16,0.96)" : "rgba(17,17,16,0.80)",
				backdropFilter: "blur(16px)",
				borderBottom: "1px solid rgba(65,64,64,0.5)",
				transition: "background 0.3s",
			}}
		>
			<a href="/" className="flex items-center gap-2.5 text-primary no-underline">
				<div
					className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center bg-accent"
					style={{ borderRadius: "7px" }}
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
			</a>

			<ul className="hidden list-none gap-0.5 md:flex">
				{navigationLinks.map((link) => (
					<li key={link.href}>
						<a
							href={link.href}
							className="block rounded-md px-3 py-[5px] text-[13.5px] text-muted no-underline transition-colors duration-150 hover:bg-secondary hover:text-primary"
						>
							{link.label}
						</a>
					</li>
				))}
			</ul>

			<div className="flex items-center gap-2.5">
				<Button
					asChild
					variant="ghost"
					size="sm"
					className="hidden border border-transparent bg-transparent text-[13.5px] font-medium text-muted shadow-none hover:border-border hover:bg-secondary hover:text-primary sm:inline-flex"
				>
					<a href="/login">Entrar</a>
				</Button>

				<Button
					asChild
					size="sm"
					className="h-auto bg-accent px-3.5 py-[7px] text-[13.5px] font-semibold text-ink-900 hover:bg-accent-light"
				>
					<a href="/download">Baixar grátis</a>
				</Button>
			</div>
		</nav>
	)
}
