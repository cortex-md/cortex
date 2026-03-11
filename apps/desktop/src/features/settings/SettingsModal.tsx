import { useSettingsStore } from "@cortex/settings"
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@cortex/ui"
import { Keyboard, Palette, Settings, Type } from "lucide-react"
import { useState } from "react"
import { AppearanceSection } from "./AppearanceSettings"
import { EditorSection } from "./EditorSettings"
import { GeneralSection } from "./GeneralSettings"
import { HotkeysSection } from "./HotkeysSettings"

const sections = [
	{ name: "General", id: "general", icon: Settings, component: GeneralSection },
	{ name: "Appearance", id: "appearance", icon: Palette, component: AppearanceSection },
	{ name: "Editor", id: "editor", icon: Type, component: EditorSection },
	{ name: "Hotkeys", id: "hotkeys", icon: Keyboard, component: HotkeysSection },
] as const

interface SettingsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
	const [activeSectionId, setActiveSectionId] = useState<string>("general")
	const { settings, updateSetting } = useSettingsStore()

	const activeSection = sections.find((s) => s.id === activeSectionId) ?? sections[0]

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[900px] lg:max-w-[1000px]">
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
				<SidebarProvider className="items-start">
					<Sidebar collapsible="none" className="hidden md:flex">
						<SidebarContent>
							<SidebarGroup>
								<SidebarGroupContent>
									<SidebarMenu>
										{sections.map((item) => (
											<SidebarMenuItem key={item.id}>
												<SidebarMenuButton
													onClick={() => setActiveSectionId(item.id)}
													isActive={activeSectionId === item.id}
												>
													<item.icon />
													<span>{item.name}</span>
												</SidebarMenuButton>
											</SidebarMenuItem>
										))}
									</SidebarMenu>
								</SidebarGroupContent>
							</SidebarGroup>
						</SidebarContent>
					</Sidebar>
					<main className="flex h-[580px] flex-1 flex-col overflow-hidden">
						<header className="flex h-12 shrink-0 items-center gap-2 border-b border-border">
							<div className="flex items-center gap-2 px-4">
								<Breadcrumb>
									<BreadcrumbList>
										<BreadcrumbItem className="hidden md:block">Settings</BreadcrumbItem>
										<BreadcrumbSeparator className="hidden md:block" />
										<BreadcrumbItem>
											<BreadcrumbPage>{activeSection.name}</BreadcrumbPage>
										</BreadcrumbItem>
									</BreadcrumbList>
								</Breadcrumb>
							</div>
						</header>
						<div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
							{activeSectionId === "general" && (
								<GeneralSection settings={settings.general} onUpdate={updateSetting} />
							)}
							{activeSectionId === "appearance" && (
								<AppearanceSection settings={settings.appearance} onUpdate={updateSetting} />
							)}
							{activeSectionId === "editor" && (
								<EditorSection settings={settings.editor} onUpdate={updateSetting} />
							)}
							{activeSectionId === "hotkeys" && <HotkeysSection />}
						</div>
					</main>
				</SidebarProvider>
			</DialogContent>
		</Dialog>
	)
}
