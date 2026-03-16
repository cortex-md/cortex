import Link from "next/link"
import { docsRegistry } from "@/lib/docs-registry"

interface Props {
	activeSlug: string
}

export function DocsSidebar({ activeSlug }: Props) {
	return (
		<nav className="sticky top-16 w-70 shrink-0 h-[calc(100vh-64px)] overflow-y-auto py-8 px-10 border-r border-border-subtle">
			<Link
				href="/docs"
				className="block mb-6 text-base font-semibold text-text-primary no-underline"
			>
				Documentation
			</Link>
			{docsRegistry.map((section) => (
				<div key={section.id} className="mt-5 first:mt-0">
					<p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">
						{section.title}
					</p>
					{section.documents.map((doc) => (
						<Link
							key={doc.slug}
							href={`/docs/${doc.slug}`}
							className={`block text-[13.5px] leading-snug px-3 py-2 rounded-lg no-underline transition-colors ${
								doc.slug === activeSlug
									? "bg-accent-subtle text-brand-text font-medium"
									: "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
							}`}
						>
							{doc.title}
						</Link>
					))}
				</div>
			))}
		</nav>
	)
}
