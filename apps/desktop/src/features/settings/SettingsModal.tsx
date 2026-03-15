import { getPluginInstance, PluginSettingsRenderer, usePluginStore } from "@cortex/plugin-runtime"
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
	LucideIcon,
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@cortex/ui"
import { Blocks, Keyboard, Palette, RefreshCw, Settings, Type } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { AppearanceSection } from "./AppearanceSettings"
import { EditorSection } from "./EditorSettings"
import { GeneralSection } from "./GeneralSettings"
import { HotkeysSection } from "./HotkeysSettings"
import { PluginsSection } from "./PluginsSettings"
import { SyncSection } from "./SyncSettings"

const coreSections = [
	{ name: "General", id: "general", icon: Settings, component: GeneralSection },
	{ name: "Appearance", id: "appearance", icon: Palette, component: AppearanceSection },
	{ name: "Editor", id: "editor", icon: Type, component: EditorSection },
	{ name: "Hotkeys", id: "hotkeys", icon: Keyboard, component: HotkeysSection },
	{ name: "Sync", id: "sync", icon: RefreshCw, component: SyncSection },
	{ name: "Plugins", id: "plugins", icon: Blocks, component: PluginsSection },
] as const

interface SettingsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
	const [activeSectionId, setActiveSectionId] = useState<string>("general")
	const { settings, updateSetting } = useSettingsStore()
	const pluginSettingsTabs = usePluginStore((s) => s.settingsTabs)
	const pluginSettingsSchemas = usePluginStore((s) => s.settingsSchemas)

	const [pluginSettingsValues, setPluginSettingsValues] = useState<Record<string, unknown>>({})

	const coreSection = coreSections.find((s) => s.id === activeSectionId)
	const pluginTab = pluginSettingsTabs.find((t) => t.id === activeSectionId)
	const activeName = coreSection?.name ?? pluginTab?.label ?? "Settings"

	useEffect(() => {
		if (!pluginTab) return
		const instance = getPluginInstance(pluginTab.id)
		if (!instance) return
		setPluginSettingsValues(instance.api.settings.getAll())
	}, [pluginTab])

	const handlePluginSettingUpdate = useCallback((pluginId: string, key: string, value: unknown) => {
		const instance = getPluginInstance(pluginId)
		if (!instance) return
		instance.api.settings.set(key, value)
		setPluginSettingsValues((prev) => ({ ...prev, [key]: value }))
	}, [])

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="overflow-hidden p-0 md:max-h-[600px] md:max-w-[900px] lg:max-w-[1000px]">
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
				<SidebarProvider className="items-start">
					<Sidebar collapsible="none" className="hidden md:flex min-h-full">
						<SidebarContent>
							<SidebarGroup>
								<SidebarGroupContent>
									<SidebarMenu>
										{coreSections.map((item) => (
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
							{pluginSettingsTabs.length > 0 && (
								<SidebarGroup>
									<SidebarGroupLabel>Plugin Settings</SidebarGroupLabel>
									<SidebarGroupContent>
										<SidebarMenu>
											{pluginSettingsTabs.map((tab) => (
												<SidebarMenuItem key={tab.id}>
													<SidebarMenuButton
														onClick={() => setActiveSectionId(tab.id)}
														isActive={activeSectionId === tab.id}
													>
														<LucideIcon name={tab.icon} size={16} />
														<span>{tab.label}</span>
													</SidebarMenuButton>
												</SidebarMenuItem>
											))}
										</SidebarMenu>
									</SidebarGroupContent>
								</SidebarGroup>
							)}
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
											<BreadcrumbPage>{activeName}</BreadcrumbPage>
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
							{activeSectionId === "sync" && <SyncSection />}
							{activeSectionId === "plugins" && <PluginsSection />}
							{pluginTab && (
								<PluginSettingsRenderer
									pluginId={pluginTab.id}
									settings={pluginSettingsSchemas[pluginTab.id] ?? pluginTab.settings}
									values={pluginSettingsValues}
									onUpdate={(key, value) => handlePluginSettingUpdate(pluginTab.id, key, value)}
								/>
							)}
						</div>
					</main>
				</SidebarProvider>
			</DialogContent>
		</Dialog>
	)
}
