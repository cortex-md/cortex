import { useAppStore, useAuthStore, useUIStore, useVaultStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import { Badge, Button, isValidLucideIconName, LucideIcon } from "@cortex/ui"
import { User, Vault } from "lucide-react"
import { useState } from "react"
import { CreateVaultModal } from "../vault/CreateVaultModal"

function AccountBadge() {
	const { authenticated, user } = useAuthStore()
	const openSettings = useUIStore((s) => s.openSettings)
	const openAuth = useUIStore((s) => s.openAuth)

	if (authenticated && user) {
		return (
			<button
				type="button"
				className="absolute top-3 right-4 flex items-center gap-2 text-xs text-text-muted hover:text-text-primary transition-colors cursor-pointer"
				onClick={() => openSettings("sync")}
			>
				<div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
					<User size={10} className="text-accent" />
				</div>
				<span className="truncate max-w-[160px]">{user.email}</span>
			</button>
		)
	}

	return (
		<button
			type="button"
			className="absolute top-3 right-4 flex items-center gap-2 text-[11px] text-text-disabled hover:text-text-muted transition-colors cursor-pointer"
			onClick={() => openAuth("login")}
		>
			<span>Sign in</span>
		</button>
	)
}

export function EmptyVaultLayout() {
	const { recentVaults, openVault } = useVaultStore()
	const { version } = useAppStore()

	const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false)
	const [selectedFolderPath, setSelectedFolderPath] = useState("")

	const handleOpenVault = async () => {
		const folderPath = await getPlatform().dialog.pickFolder()
		if (!folderPath) return

		const existingVault = recentVaults.find((vault) => vault.path === folderPath)

		if (existingVault) {
			await openVault(folderPath)
			return
		}

		setSelectedFolderPath(folderPath)
		setIsCreateVaultOpen(true)
	}

	const handleCreateVault = async () => {
		const folderPath = await getPlatform().dialog.pickFolder()
		if (!folderPath) return

		setSelectedFolderPath(folderPath)
		setIsCreateVaultOpen(true)
	}

	return (
		<div className="relative flex-1 flex flex-col items-center justify-center gap-2.5 text-text-muted text-sm">
			<AccountBadge />
			<CreateVaultModal
				open={isCreateVaultOpen}
				folderPath={selectedFolderPath}
				onOpenChange={setIsCreateVaultOpen}
			/>
			<h1 className="text-2xl font-bold text-text-primary">Cortex</h1>
			<Badge variant="secondary">{version}</Badge>
			<p className="pt-2.5">Open an existing folder or create a new vault</p>
			<div className="flex gap-2 pt-1 pb-2.5">
				<Button onClick={handleOpenVault}>Open Vault</Button>
				<Button variant="outline" onClick={handleCreateVault}>
					Create New Vault
				</Button>
			</div>
			{recentVaults.length > 0 && (
				<div className="pt-2.5 w-full max-w-sm">
					<h3 className="pb-2.5 text-center text-xs font-medium text-text-muted uppercase tracking-wide">
						Recent vaults
					</h3>
					<ul className="space-y-0.5">
						{recentVaults.map((vault) => (
							<li
								className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-bg-secondary cursor-pointer list-none"
								key={vault.path}
								onClick={() => openVault(vault.path)}
								onKeyDown={(e) => e.key === "Enter" && openVault(vault.path)}
							>
								<span className="flex items-center gap-1.5 shrink-0">
									{vault.color && (
										<span
											className="w-2.5 h-2.5 rounded-full shrink-0"
											style={{ backgroundColor: vault.color }}
										/>
									)}
									{vault.icon && isValidLucideIconName(vault.icon) ? (
										<LucideIcon name={vault.icon} size={16} />
									) : (
										<Vault size={16} />
									)}
								</span>
								<span className="flex flex-col min-w-0 flex-1">
									<span className="font-medium text-text-primary truncate">{vault.name}</span>
									<span className="text-[11px] text-text-muted truncate">{vault.path}</span>
								</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
