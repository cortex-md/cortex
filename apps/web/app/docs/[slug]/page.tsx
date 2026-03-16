import { notFound } from "next/navigation"
import { DocsNav } from "@/components/docs-nav"
import { DocsSidebar } from "@/components/docs-sidebar"
import { DocsToc } from "@/components/docs-toc"
import { allDocuments, findDocumentBySlug, findSectionBySlug } from "@/lib/docs-registry"

interface Props {
	params: Promise<{ slug: string }>
}

export function generateStaticParams() {
	return allDocuments.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: Props) {
	const { slug } = await params
	const doc = findDocumentBySlug(slug)
	return { title: doc ? `${doc.title} — Cortex Docs` : "Not Found" }
}

export default async function DocsPage({ params }: Props) {
	const { slug } = await params

	const document = findDocumentBySlug(slug)
	const section = findSectionBySlug(slug)

	if (!document || !section) notFound()

	const Content = document.content

	const docsMetadata = allDocuments.map((doc) => ({ slug: doc.slug, title: doc.title }))

	return (
		<div className="flex min-h-[calc(100vh-64px)] items-start">
			<DocsSidebar activeSlug={slug} />
			<main className="doc-content">
				<DocsNav docs={docsMetadata} />
				<Content />
			</main>
			<DocsToc />
		</div>
	)
}
