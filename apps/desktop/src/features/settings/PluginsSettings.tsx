import { useUIStore, useVaultStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import {
	disablePlugin,
	enablePlugin,
	getCommunityPluginsDir,
	type PluginRecord,
	saveEnabledPlugins,
	usePluginStore,
} from "@cortex/plugin-runtime"
import { Button, LucideIcon, Switch } from "@cortex/ui"
import { FolderOpen, Store } from "lucide-react"
import { useCallback } from "react"
import {
	SettingsBlock,
	SettingsEmptyState,
	SettingsList,
	SettingsListItem,
	SettingsPage,
} from "./SettingsPrimitives"

function PluginRow({ record }: { record: PluginRecord }) {
	const { vault } = useVaultStore()
	const isEnabled = record.status === "enabled"
	const hasError = record.status === "error"

	const handleToggle = useCallback(
		async (checked: boolean) => {
			if (checked) {
				await enablePlugin(record.manifest.id, () => vault?.path ?? null)
			} else {
				await disablePlugin(record.manifest.id)
			}
			if (vault?.path) {
				await saveEnabledPlugins(vault.path)
			}
		},
		[record.manifest.id, vault],
	)

	return (
		<SettingsListItem>
			<div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
				<LucideIcon name={record.manifest.icon} size={16} className="text-text-muted" />
			</div>
			<div className="flex flex-col min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium truncate text-foreground">
						{record.manifest.name}
					</span>
					<span className="text-xs text-muted-foreground">v{record.manifest.version}</span>
					<span className="text-xs text-muted-foreground">by {record.manifest.author}</span>
				</div>
				<span className="text-xs text-muted-foreground truncate">
					{record.manifest.description}
				</span>
				{hasError && record.error && (
					<span className="text-xs text-red-500 truncate">{record.error}</span>
				)}
			</div>
			<Switch checked={isEnabled} onCheckedChange={handleToggle} />
		</SettingsListItem>
	)
}

export function PluginsSection() {
	const plugins = usePluginStore((s) => s.plugins)
	const openMarketplace = useUIStore((s) => s.openMarketplace)

	const pluginRecords = Object.values(plugins)
	const corePlugins = pluginRecords.filter((p) => p.manifest.author === "Cortex")
	const communityPlugins = pluginRecords.filter((p) => p.manifest.author !== "Cortex")

	const handleOpenPluginsFolder = async () => {
		const dir = getCommunityPluginsDir()
		const platform = getPlatform()
		try {
			await platform.fs.createDir(dir)
		} catch {}
		try {
			await platform.dialog.revealFolder(dir)
		} catch {
			await platform.dialog.showAlert(
				"Plugins Folder",
				`Community plugins directory: ${dir}\n\nCreate this folder to install community plugins.`,
			)
		}
	}

	return (
		<SettingsPage>
			<SettingsBlock
				title="Core Plugins"
				description="Built-in plugin modules shipped with Cortex."
			>
				{corePlugins.length === 0 ? (
					<SettingsEmptyState>No core plugins installed</SettingsEmptyState>
				) : (
					<SettingsList>
						{corePlugins.map((record) => (
							<PluginRow key={record.manifest.id} record={record} />
						))}
					</SettingsList>
				)}
			</SettingsBlock>

			<SettingsBlock
				title="Community Plugins"
				description="Vault-scoped plugins installed in this workspace."
				action={
					<>
						<Button variant="ghost" size="sm" onClick={() => openMarketplace("plugins")}>
							<Store size={12} />
							Browse
						</Button>
						<Button variant="ghost" size="sm" onClick={handleOpenPluginsFolder}>
							<FolderOpen size={12} />
							Open folder
						</Button>
					</>
				}
			>
				{communityPlugins.length === 0 ? (
					<SettingsEmptyState>
						No community plugins installed. Place plugins in vault/.cortex/plugins/ to get started.
					</SettingsEmptyState>
				) : (
					<SettingsList>
						{communityPlugins.map((record) => (
							<PluginRow key={record.manifest.id} record={record} />
						))}
					</SettingsList>
				)}
			</SettingsBlock>
		</SettingsPage>
	)
}
