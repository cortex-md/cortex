import { useAuthStore, useVaultStore, type VaultRegistryEntry } from "@cortex/core"
import type { GeneralSettings } from "@cortex/settings"
import { Button, isValidLucideIconName, Label, LucideIcon, Switch } from "@cortex/ui"
import { LogIn, LogOut, Trash2, User, Vault } from "lucide-react"
import type { UpdateSettingFn } from "."

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
		<div className="flex items-center gap-3 px-0 py-2 group">
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
					<span className="truncate text-xs font-medium">{entry.name}</span>
					<span className="truncate text-[10px] text-text-muted">{entry.path}</span>
				</span>
			</span>
			<span className="text-[10px] text-text-muted whitespace-nowrap">
				{formatLastOpened(entry.lastOpened)}
			</span>
			<span className="flex items-center gap-1">
				{!isActive && (
					<Button variant="ghost" size="sm" onClick={handleOpen} className="text-xs h-6 px-2">
						Open
					</Button>
				)}
				{isActive && <span className="text-[10px] text-accent font-medium px-2">Active</span>}
				<Button
					variant="ghost"
					size="icon"
					onClick={handleRemove}
					className="h-6 w-6 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<Trash2 size={12} />
				</Button>
			</span>
		</div>
	)
}

function AccountSection() {
	const { user, offline, logout, setOffline } = useAuthStore()

	if (user) {
		return (
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Account
				</h3>
				<div className="flex items-center gap-3 py-2">
					<div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
						<User size={14} className="text-accent" />
					</div>
					<div className="flex flex-col min-w-0 flex-1">
						<span className="text-xs font-medium truncate">{user.email}</span>
						<span className="text-[10px] text-text-muted">Signed in</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => logout()}
						className="text-xs h-6 px-2 text-text-muted gap-1.5"
					>
						<LogOut size={12} />
						Sign out
					</Button>
				</div>
			</div>
		)
	}

	if (offline) {
		return (
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Account
				</h3>
				<div className="flex items-center gap-3 py-2">
					<div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center shrink-0">
						<User size={14} className="text-text-muted" />
					</div>
					<div className="flex flex-col min-w-0 flex-1">
						<span className="text-xs font-medium text-text-muted">Not signed in</span>
						<span className="text-[10px] text-text-muted">Syncing is disabled</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setOffline(false)}
						className="text-xs h-6 px-2 text-text-muted gap-1.5"
					>
						<LogIn size={12} />
						Sign in
					</Button>
				</div>
			</div>
		)
	}

	return null
}

export function GeneralSection({ settings, onUpdate }: GeneralSectionProps) {
	const { recentVaults } = useVaultStore()

	return (
		<section>
			<AccountSection />

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Startup
				</h3>
				<div className="flex items-center justify-between px-0 py-2 gap-4">
					<Label htmlFor="auto-open-vault" className="flex-1">
						Open last vault on startup
					</Label>
					<Switch
						id="auto-open-vault"
						checked={settings.autoOpenLastVault}
						onCheckedChange={(checked) => onUpdate("general", "autoOpenLastVault", checked)}
					/>
				</div>
			</div>

			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Vaults
				</h3>
				{recentVaults.length === 0 ? (
					<p className="text-xs text-text-muted py-2">No recent vaults</p>
				) : (
					<div className="flex flex-col">
						{recentVaults.map((entry) => (
							<VaultRow key={entry.uuid} entry={entry} />
						))}
					</div>
				)}
			</div>
		</section>
	)
}
