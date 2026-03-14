import { useVaultStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import {
	disablePlugin,
	enablePlugin,
	getCommunityPluginsDir,
	type PluginRecord,
	usePluginStore,
} from "@cortex/plugin-runtime"
import { Button, LucideIcon, Switch } from "@cortex/ui"
import { FolderOpen } from "lucide-react"
import { useCallback } from "react"

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
		},
		[record.manifest.id, vault],
	)

	return (
		<div className="flex items-center gap-3 px-0 py-3 group">
			<div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center shrink-0">
				<LucideIcon name={record.manifest.icon} size={16} className="text-text-muted" />
			</div>
			<div className="flex flex-col min-w-0 flex-1">
				<div className="flex items-center gap-2">
					<span className="text-xs font-medium truncate">{record.manifest.name}</span>
					<span className="text-[10px] text-text-muted">v{record.manifest.version}</span>
					<span className="text-[10px] text-text-muted">by {record.manifest.author}</span>
				</div>
				<span className="text-[10px] text-text-muted truncate">{record.manifest.description}</span>
				{hasError && record.error && (
					<span className="text-[10px] text-red-500 truncate">{record.error}</span>
				)}
			</div>
			<Switch checked={isEnabled} onCheckedChange={handleToggle} />
		</div>
	)
}

export function PluginsSection() {
	const plugins = usePluginStore((s) => s.plugins)

	const pluginRecords = Object.values(plugins)
	const corePlugins = pluginRecords.filter((p) => p.manifest.author === "Cortex")
	const communityPlugins = pluginRecords.filter((p) => p.manifest.author !== "Cortex")

	const handleOpenPluginsFolder = async () => {
		const dir = getCommunityPluginsDir()
		try {
			await getPlatform().dialog.revealFolder(dir)
		} catch {
			await getPlatform().dialog.showAlert(
				"Plugins Folder",
				`Community plugins directory: ${dir}\n\nCreate this folder to install community plugins.`,
			)
		}
	}

	return (
		<section>
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Core Plugins
				</h3>
				{corePlugins.length === 0 ? (
					<p className="text-xs text-text-muted py-2">No core plugins installed</p>
				) : (
					<div className="flex flex-col divide-y divide-border">
						{corePlugins.map((record) => (
							<PluginRow key={record.manifest.id} record={record} />
						))}
					</div>
				)}
			</div>

			<div className="mb-6">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-[10px] font-bold m-0 text-text-muted uppercase tracking-wide">
						Community Plugins
					</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={handleOpenPluginsFolder}
						className="text-xs h-6 px-2 gap-1.5"
					>
						<FolderOpen size={12} />
						Open folder
					</Button>
				</div>
				{communityPlugins.length === 0 ? (
					<p className="text-xs text-text-muted py-2">
						No community plugins installed. Place plugins in ~/.cortex/plugins/ to get started.
					</p>
				) : (
					<div className="flex flex-col divide-y divide-border">
						{communityPlugins.map((record) => (
							<PluginRow key={record.manifest.id} record={record} />
						))}
					</div>
				)}
			</div>
		</section>
	)
}
