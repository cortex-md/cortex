import { type MarketplaceTab, useUIStore, useVaultStore } from "@cortex/core"
import { getPluginInstance, PluginSettingsRenderer, usePluginStore } from "@cortex/plugin-runtime"
import { useSettingsStore } from "@cortex/settings"
import type { FolderPickerOption } from "@cortex/ui"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	LucideIcon,
	NativeSelect,
	NativeSelectOptGroup,
	NativeSelectOption,
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
import { SettingsPage, SettingsPageHeader, SettingsSection } from "./SettingsPrimitives"
import { SyncSection } from "./SyncSettings"

interface SettingsSectionItem {
	id: string
	navigationLabel: string
	title: string
	description: string
	icon: typeof Settings
}

interface SettingsSectionGroup {
	label: string
	sections: SettingsSectionItem[]
}

const appSections: SettingsSectionItem[] = [
	{
		id: "general",
		navigationLabel: "General",
		title: "General",
		description: "Startup behavior and recently opened vaults.",
		icon: Settings,
	},
	{
		id: "appearance",
		navigationLabel: "Appearance",
		title: "Appearance",
		description: "Theme, accent color, and interface typography.",
		icon: Palette,
	},
	{
		id: "editor",
		navigationLabel: "Editor",
		title: "Editor",
		description: "Editing behavior, indentation, and attachment storage.",
		icon: Type,
	},
	{
		id: "hotkeys",
		navigationLabel: "Hotkeys",
		title: "Keyboard shortcuts",
		description: "Search, record, and reset command bindings for this vault.",
		icon: Keyboard,
	},
]

const syncSections: SettingsSectionItem[] = [
	{
		id: "sync",
		navigationLabel: "Overview",
		title: "Sync",
		description: "Connection status and the remote vault linked to this workspace.",
		icon: RefreshCw,
	},
	{
		id: "sync-preferences",
		navigationLabel: "Preferences",
		title: "Sync preferences",
		description: "Choose which content and app state are synchronized.",
		icon: SlidersHorizontal,
	},
	{
		id: "sync-members",
		navigationLabel: "Members",
		title: "Sync members",
		description: "Manage access to the linked remote vault.",
		icon: Users,
	},
	{
		id: "sync-self-host",
		navigationLabel: "Self-hosted",
		title: "Self-hosted sync",
		description: "Configure the server and environment used by this vault.",
		icon: Server,
	},
]

const extensionSections: SettingsSectionItem[] = [
	{
		id: "plugins",
		navigationLabel: "Plugins",
		title: "Plugins",
		description: "Manage built-in and community extensions for this vault.",
		icon: Blocks,
	},
	{
		id: "marketplace",
		navigationLabel: "Marketplace",
		title: "Marketplace",
		description: "Discover community plugins and themes.",
		icon: Store,
	},
]

const settingsSectionGroups: SettingsSectionGroup[] = [
	{ label: "Cortex", sections: appSections },
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
	const activeTitle = coreSection?.title ?? pluginTab?.label ?? "Settings"
	const activeDescription =
		coreSection?.description ?? "Configure this plugin for the current vault."

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
												<span>{item.navigationLabel}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					))}
					{pluginSettingsTabs.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Plugin settings</SidebarGroupLabel>
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
				<div className="shrink-0 border-b border-border p-4 md:hidden [&>[data-slot=native-select-wrapper]]:w-full">
					<NativeSelect
						aria-label="Settings section"
						value={activeSectionId}
						onChange={(event) => setActiveSectionId(event.target.value)}
						className="w-full"
					>
						{settingsSectionGroups.map((group) => (
							<NativeSelectOptGroup key={group.label} label={group.label}>
								{group.sections.map((item) => (
									<NativeSelectOption key={item.id} value={item.id}>
										{item.navigationLabel}
									</NativeSelectOption>
								))}
							</NativeSelectOptGroup>
						))}
						{pluginSettingsTabs.length > 0 && (
							<NativeSelectOptGroup label="Plugin settings">
								{pluginSettingsTabs.map((tab) => (
									<NativeSelectOption key={tab.id} value={tab.id}>
										{tab.label}
									</NativeSelectOption>
								))}
							</NativeSelectOptGroup>
						)}
					</NativeSelect>
				</div>
				<div
					className={
						activeSectionId === "marketplace"
							? "flex min-h-0 flex-1 flex-col overflow-hidden"
							: "min-h-0 flex-1 overflow-y-auto"
					}
				>
					{activeSectionId === "marketplace" && <MarketplaceSection initialTab={marketplaceTab} />}
					{activeSectionId !== "marketplace" && (
						<div className="mx-auto flex w-full max-w-[860px] flex-col gap-7 px-5 py-7 md:px-8 md:py-8">
							<SettingsPageHeader title={activeTitle} description={activeDescription} />
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
							{pluginTab && (
								<SettingsPage>
									<SettingsSection
										title={pluginTab.label}
										description="Settings declared by this plugin for the current vault."
									>
										<PluginSettingsRenderer
											pluginId={pluginTab.id}
											settings={pluginSettingsSchemas[pluginTab.id] ?? pluginTab.settings}
											values={pluginSettingsValues}
											onUpdate={(key, value) => handlePluginSettingUpdate(pluginTab.id, key, value)}
										/>
									</SettingsSection>
								</SettingsPage>
							)}
						</div>
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
