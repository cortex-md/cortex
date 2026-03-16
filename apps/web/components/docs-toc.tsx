"use client"

import { TableOfContents } from "lucide-react"
import { useEffect, useRef, useState } from "react"

interface TocEntry {
	id: string
	text: string
	level: 2 | 3
}

interface Props {
	contentSelector?: string
}

export function DocsToc({ contentSelector = ".doc-content" }: Props) {
	const [entries, setEntries] = useState<TocEntry[]>([])
	const [activeId, setActiveId] = useState<string>("")
	const observerRef = useRef<IntersectionObserver | null>(null)

	useEffect(() => {
		const container = document.querySelector(contentSelector)
		if (!container) return

		const headings = Array.from(container.querySelectorAll("h2, h3")) as HTMLElement[]

		const tocEntries: TocEntry[] = headings
			.filter((heading) => heading.id)
			.map((heading) => ({
				id: heading.id,
				text: heading.textContent ?? "",
				level: Number(heading.tagName.slice(1)) as 2 | 3,
			}))

		setEntries(tocEntries)

		if (tocEntries.length === 0) return

		const visibleIds = new Set<string>()

		observerRef.current?.disconnect()

		observerRef.current = new IntersectionObserver(
			(intersectionEntries) => {
				for (const entry of intersectionEntries) {
					if (entry.isIntersecting) {
						visibleIds.add(entry.target.id)
					} else {
						visibleIds.delete(entry.target.id)
					}
				}

				const firstVisible = tocEntries.find((tocEntry) => visibleIds.has(tocEntry.id))
				if (firstVisible) setActiveId(firstVisible.id)
			},
			{ rootMargin: "-80px 0px -60% 0px", threshold: 0 },
		)

		for (const heading of headings) {
			if (heading.id) observerRef.current.observe(heading)
		}

		return () => observerRef.current?.disconnect()
	}, [contentSelector])

	if (entries.length === 0) return null

	return (
		<nav className="sticky top-16 w-52 shrink-0 h-[calc(100vh-64px)] overflow-y-auto py-8 pl-4 pr-6">
			<p className="flex items-center gap-1 mb-2.5 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
				<TableOfContents size={14} />
				<span>On this page</span>
			</p>
			<ul className="flex flex-col gap-0.5 list-none  m-0 p-0">
				{entries.map((entry) => (
					<li key={entry.id} className={entry.level === 3 ? "pl-3" : ""}>
						<a
							href={`#${entry.id}`}
							className={`block text-sm leading-snug px-1.5 py-1 rounded no-underline border-l-2 transition-colors ${
								activeId === entry.id
									? "text-brand-text border-brand"
									: "text-text-muted border-transparent hover:text-text-secondary"
							}`}
						>
							{entry.text}
						</a>
					</li>
				))}
			</ul>
		</nav>
	)
}
