import type { DocsDocumentMetadata } from "@/lib/docs-registry"
import { CortexLogo } from "./logo"

import { SearchDoc } from "./search-doc"
import { ThemeToggle } from "./theme-toggle"

interface DocsNavProps {
	docs: DocsDocumentMetadata[]
}

export function DocsNav({ docs }: DocsNavProps) {
	return (
		<nav
			className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center justify-between px-6 md:px-10"
			style={{
				backdropFilter: "blur(16px)",
				WebkitBackdropFilter: "blur(16px)",
				transition: "background 0.3s",
			}}
		>
			<CortexLogo />

			<div>
				<SearchDoc docs={docs} />
			</div>
			<div className="flex items-center gap-1.5">
				<ThemeToggle />
			</div>
		</nav>
	)
}
