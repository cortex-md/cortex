import type { MDXProps } from "mdx/types"
import type { ComponentType } from "react"

import GettingStarted from "@/docs/getting-started.mdx"
import FirstPlugin from "@/docs/starting-plugins.mdx"

export interface DocsDocument {
	slug: string
	title: string
	content: ComponentType<MDXProps>
}

export interface DocsSection {
	id: string
	title: string
	documents: DocsDocument[]
}

export const docsRegistry: DocsSection[] = [
	{
		id: "getting-started",
		title: "Getting Started",
		documents: [{ slug: "getting-started", title: "Introduction", content: GettingStarted }],
	},
	{
		id: "plugins",
		title: "Plugins",
		documents: [{ slug: "first-plugin", title: "First Plugin", content: FirstPlugin }],
	},
]

export const allDocuments: DocsDocument[] = docsRegistry.flatMap((section) => section.documents)

export function findDocumentBySlug(slug: string): DocsDocument | undefined {
	return allDocuments.find((doc) => doc.slug === slug)
}

export function findSectionBySlug(slug: string): DocsSection | undefined {
	return docsRegistry.find((section) => section.documents.some((doc) => doc.slug === slug))
}

export const firstDocSlug = docsRegistry[0].documents[0].slug
