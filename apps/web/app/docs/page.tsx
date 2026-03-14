import { redirect } from "next/navigation"

import { firstDocSlug } from "@/lib/docs-registry"

export default function DocsIndexPage() {
	redirect(`/docs/${firstDocSlug}`)
}
