import { useVaultStore, type VaultRegistryEntry } from "@cortex/core"
import type { GeneralSettings } from "@cortex/settings"
import { Button, isValidLucideIconName, LucideIcon, Switch } from "@cortex/ui"
import { Trash2, Vault } from "lucide-react"
import type { UpdateSettingFn } from "."
import {
	SettingsBlock,
	SettingsEmptyState,
	SettingsField,
	SettingsList,
	SettingsListItem,
	SettingsPage,
} from "./SettingsPrimitives"

interface GeneralSectionProps {
	settings: GeneralSettings
	onUpdate: UpdateSettingFn
}

function formatLastOpened(timestamp: number): string {
	const date = new Date(timestamp * 1000)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) return "Today"
	if (diffDays === 1) return "Yesterday"
	if (diffDays < 7) return `${diffDays} days ago`
	return date.toLocaleDateString()
}

function VaultRow({ entry }: { entry: VaultRegistryEntry }) {
	const { vault, openVault, closeVault, removeRecentVault } = useVaultStore()
	const isActive = vault?.uuid === entry.uuid

	const handleOpen = async () => {
		if (isActive) return
		await closeVault()
		await openVault(entry.path)
	}

	const handleRemove = async () => {
		await removeRecentVault(entry.uuid)
	}

	return (
		<SettingsListItem>
			<span className="flex items-center gap-2 min-w-0 flex-1">
				{entry.color && (
					<span
						className="w-2.5 h-2.5 rounded-full shrink-0"
						style={{ backgroundColor: entry.color }}
					/>
				)}
				{entry.icon && isValidLucideIconName(entry.icon) ? (
					<LucideIcon name={entry.icon} size={16} className="shrink-0 text-text-muted" />
				) : (
					<Vault size={16} className="shrink-0 text-text-muted" />
				)}
				<span className="flex flex-col min-w-0">
					<span className="truncate text-sm font-medium text-foreground">{entry.name}</span>
					<span className="truncate text-xs text-muted-foreground">{entry.path}</span>
				</span>
			</span>
			<span className="text-xs text-muted-foreground whitespace-nowrap">
				{formatLastOpened(entry.lastOpened)}
			</span>
			<span className="flex items-center gap-1">
				{!isActive && (
					<Button variant="ghost" size="sm" onClick={handleOpen} className="h-7 px-2">
						Open
					</Button>
				)}
				{isActive && <span className="px-2 text-xs font-medium text-accent">Active</span>}
				<Button
					variant="ghost"
					size="icon"
					onClick={handleRemove}
					className="h-7 w-7 text-text-muted opacity-0 transition-opacity group-hover:opacity-100"
				>
					<Trash2 size={12} />
				</Button>
			</span>
		</SettingsListItem>
	)
}

export function GeneralSection({ settings, onUpdate }: GeneralSectionProps) {
	const { recentVaults } = useVaultStore()

	return (
		<SettingsPage>
			<SettingsBlock title="Startup" description="Choose what Cortex opens when the app launches.">
				<SettingsField label="Open last vault on startup" htmlFor="auto-open-vault">
					<Switch
						id="auto-open-vault"
						checked={settings.autoOpenLastVault}
						onCheckedChange={(checked) => onUpdate("general", "autoOpenLastVault", checked)}
					/>
				</SettingsField>
			</SettingsBlock>

			<SettingsBlock title="Vaults" description="Recently opened vaults on this device.">
				{recentVaults.length === 0 ? (
					<SettingsEmptyState>No recent vaults</SettingsEmptyState>
				) : (
					<SettingsList>
						{recentVaults.map((entry) => (
							<VaultRow key={entry.uuid} entry={entry} />
						))}
					</SettingsList>
				)}
			</SettingsBlock>
		</SettingsPage>
	)
}
