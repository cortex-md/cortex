"use client"

import { type ReactNode, useEffect, useRef } from "react"

interface Props {
	children: ReactNode
	delay?: number
	className?: string
}

export default function ScrollReveal({ children, delay = 0, className = "" }: Props) {
	const ref = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const el = ref.current
		if (!el) return

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						if (delay > 0) {
							el.style.transitionDelay = `${delay}s`
						}
						el.classList.add("visible")
						observer.unobserve(el)
					}
				})
			},
			{ threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
		)

		observer.observe(el)

		return () => observer.disconnect()
	}, [delay])

	return (
		<div ref={ref} className={`reveal ${className}`}>
			{children}
		</div>
	)
}
