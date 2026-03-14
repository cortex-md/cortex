import {
	Collapsible,
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@cortex/ui"

import { docsRegistry } from "@/lib/docs-registry"

interface Props {
	activeSlug: string
}

export function DocsSidebar({ activeSlug }: Props) {
	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<a
					href="/docs"
					className="px-2 py-1 text-[14px] font-semibold text-foreground no-underline"
				>
					Documentation
				</a>
			</SidebarHeader>
			<SidebarContent>
				{docsRegistry.map((section) => (
					<SidebarGroup key={section.id}>
						<SidebarGroupLabel>{section.title}</SidebarGroupLabel>
						<SidebarMenu>
							{section.documents.map((doc) => (
								<Collapsible
									key={doc.slug}
									asChild
									defaultOpen={doc.slug === activeSlug}
									className="group/collapsible"
								>
									<SidebarMenuItem>
										<SidebarMenuButton
											tooltip={doc.title}
											isActive={doc.slug === activeSlug}
											asChild
										>
											<a href={`/docs/${doc.slug}`}>{doc.title}</a>
										</SidebarMenuButton>
									</SidebarMenuItem>
								</Collapsible>
							))}
						</SidebarMenu>
					</SidebarGroup>
				))}
			</SidebarContent>
			<SidebarFooter />
			<SidebarRail />
		</Sidebar>
	)
}
