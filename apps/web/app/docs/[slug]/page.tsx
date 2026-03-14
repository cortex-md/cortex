import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Separator,
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@cortex/ui"
import { notFound } from "next/navigation"

import { DocsSidebar } from "@/components/docs-sidebar"
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

	return (
		<SidebarProvider>
			<DocsSidebar activeSlug={slug} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b border-border px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem>
								<BreadcrumbLink href="/docs">{section.title}</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
							<BreadcrumbItem>
								<BreadcrumbPage>{document.title}</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</header>
				<main className="mx-auto w-full max-w-3xl px-8 py-10 prose prose-neutral dark:prose-invert">
					<Content />
				</main>
			</SidebarInset>
		</SidebarProvider>
	)
}
