import { type MarketplaceTab, useUIStore, useVaultStore } from "@cortex/core"
import { getPluginInstance, PluginSettingsRenderer, usePluginStore } from "@cortex/plugin-runtime"
import { useSettingsStore } from "@cortex/settings"
import type { FolderPickerOption } from "@cortex/ui"
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
import {
	Blocks,
	Keyboard,
	Palette,
	RefreshCw,
	Server,
	Settings,
	SlidersHorizontal,
	Store,
	Type,
	Users,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { MarketplaceSection } from "../marketplace"
import { AppearanceSection } from "./AppearanceSettings"
import { EditorSection } from "./EditorSettings"
import { GeneralSection } from "./GeneralSettings"
import { HotkeysSection } from "./HotkeysSettings"
import { PluginsSection } from "./PluginsSettings"
import { SettingsBlock, SettingsPage } from "./SettingsPrimitives"
import { SyncSection } from "./SyncSettings"

interface SettingsSectionItem {
	name: string
	id: string
	icon: typeof Settings
}

interface SettingsSectionGroup {
	label: string
	sections: SettingsSectionItem[]
}

const appSections: SettingsSectionItem[] = [
	{ name: "General", id: "general", icon: Settings },
	{ name: "Appearance", id: "appearance", icon: Palette },
	{ name: "Editor", id: "editor", icon: Type },
	{ name: "Hotkeys", id: "hotkeys", icon: Keyboard },
]

const syncSections: SettingsSectionItem[] = [
	{ name: "Sync", id: "sync", icon: RefreshCw },
	{ name: "Preferences", id: "sync-preferences", icon: SlidersHorizontal },
	{ name: "Members", id: "sync-members", icon: Users },
	{ name: "Self-host", id: "sync-self-host", icon: Server },
]

const extensionSections: SettingsSectionItem[] = [
	{ name: "Plugins", id: "plugins", icon: Blocks },
	{ name: "Marketplace", id: "marketplace", icon: Store },
]

const settingsSectionGroups: SettingsSectionGroup[] = [
	{ label: "App", sections: appSections },
	{ label: "Sync", sections: syncSections },
	{ label: "Extensions", sections: extensionSections },
]

const settingsSections = settingsSectionGroups.flatMap((group) => group.sections)

interface SettingsModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

interface SettingsContentProps {
	initialSection?: string | null
	initialMarketplaceTab?: MarketplaceTab
	fullHeight?: boolean
}

export function SettingsContent({
	initialSection = null,
	initialMarketplaceTab,
	fullHeight = false,
}: SettingsContentProps) {
	const storeSettingsInitialSection = useUIStore((s) => s.settingsInitialSection)
	const storeMarketplaceInitialTab = useUIStore((s) => s.marketplaceInitialTab)
	const [activeSectionId, setActiveSectionId] = useState<string>(initialSection ?? "general")
	const { settings, updateSetting } = useSettingsStore()
	const pluginSettingsTabs = usePluginStore((s) => s.settingsTabs)
	const pluginSettingsSchemas = usePluginStore((s) => s.settingsSchemas)

	const [pluginSettingsValues, setPluginSettingsValues] = useState<Record<string, unknown>>({})

	const files = useVaultStore((s) => s.files)
	const vault = useVaultStore((s) => s.vault)

	const vaultFolders: FolderPickerOption[] = useMemo(() => {
		if (!vault?.path) return []
		return files
			.filter((f) => f.isDir && !f.name.startsWith("."))
			.map((f) => {
				const relative = f.path.replace(`${vault.path}/`, "")
				return { value: relative, label: `${relative}/`, isDir: true }
			})
	}, [files, vault?.path])

	const requestedSection = initialSection ?? storeSettingsInitialSection
	const marketplaceTab = initialMarketplaceTab ?? storeMarketplaceInitialTab

	useEffect(() => {
		if (requestedSection) {
			setActiveSectionId(requestedSection)
		}
	}, [requestedSection])

	const coreSection = settingsSections.find((s) => s.id === activeSectionId)
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
		<SidebarProvider className="settings-content h-full min-h-0 items-start overflow-hidden">
			<Sidebar collapsible="none" className="hidden h-full min-h-0 md:flex">
				<SidebarContent>
					{settingsSectionGroups.map((group) => (
						<SidebarGroup key={group.label}>
							<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{group.sections.map((item) => (
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
					))}
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
			<main
				className={`settings-main flex min-h-0 flex-1 flex-col overflow-hidden ${
					fullHeight ? "h-full" : "h-full max-h-full"
				}`}
			>
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
				<div
					className={
						activeSectionId === "marketplace"
							? "flex min-h-0 flex-1 flex-col overflow-hidden"
							: "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4"
					}
				>
					{activeSectionId === "general" && (
						<GeneralSection settings={settings.general} onUpdate={updateSetting} />
					)}
					{activeSectionId === "appearance" && (
						<AppearanceSection settings={settings.appearance} onUpdate={updateSetting} />
					)}
					{activeSectionId === "editor" && (
						<EditorSection
							settings={settings.editor}
							onUpdate={updateSetting}
							vaultFolders={vaultFolders}
						/>
					)}
					{activeSectionId === "hotkeys" && <HotkeysSection />}
					{activeSectionId === "sync" && <SyncSection view="overview" />}
					{activeSectionId === "sync-preferences" && <SyncSection view="preferences" />}
					{activeSectionId === "sync-members" && <SyncSection view="members" />}
					{activeSectionId === "sync-self-host" && <SyncSection view="self-host" />}
					{activeSectionId === "plugins" && <PluginsSection />}
					{activeSectionId === "marketplace" && <MarketplaceSection initialTab={marketplaceTab} />}
					{pluginTab && (
						<SettingsPage>
							<SettingsBlock title={pluginTab.label} description="Plugin settings for this vault.">
								<PluginSettingsRenderer
									pluginId={pluginTab.id}
									settings={pluginSettingsSchemas[pluginTab.id] ?? pluginTab.settings}
									values={pluginSettingsValues}
									onUpdate={(key, value) => handlePluginSettingUpdate(pluginTab.id, key, value)}
								/>
							</SettingsBlock>
						</SettingsPage>
					)}
				</div>
			</main>
		</SidebarProvider>
	)
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
	const settingsInitialSection = useUIStore((s) => s.settingsInitialSection)
	const marketplaceInitialTab = useUIStore((s) => s.marketplaceInitialTab)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex h-[calc(100vh-1rem)] max-h-[calc(100vh-1rem)] overflow-hidden p-0 md:h-[760px] md:max-w-[1180px] lg:max-w-[1240px] xl:max-w-[1320px]">
				<DialogTitle className="sr-only">Settings</DialogTitle>
				<DialogDescription className="sr-only">Customize your settings here.</DialogDescription>
				<SettingsContent
					initialSection={settingsInitialSection}
					initialMarketplaceTab={marketplaceInitialTab}
				/>
			</DialogContent>
		</Dialog>
	)
}
