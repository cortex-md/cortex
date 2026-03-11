import { useAppStore, useVaultStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import { Badge, Button, isValidLucideIconName, LucideIcon } from "@cortex/ui"
import { EllipsisVertical, Vault } from "lucide-react"
import { useState } from "react"
import { CreateVaultModal } from "../vault/CreateVaultModal"

export function EmptyVaultLayout() {
	const { recentVaults, openVault } = useVaultStore()
	const { version } = useAppStore()

	const [isCreateVaultOpen, setIsCreateVaultOpen] = useState(false)
	const [selectedFolderPath, setSelectedFolderPath] = useState("")

	const handleOpenVault = async () => {
		const folderPath = await getPlatform().dialog.pickFolder()
		if (!folderPath) return

		const existingVault = recentVaults.find((vault) => vault.path === folderPath)

		console.log(recentVaults)

		if (existingVault) {
			await openVault(folderPath)
			return
		}

		setSelectedFolderPath(folderPath)
		setIsCreateVaultOpen(true)
	}

	return (
		<div className="flex-1 flex flex-col items-center justify-center gap-2.5 text-text-muted text-sm">
			<CreateVaultModal
				open={isCreateVaultOpen}
				folderPath={selectedFolderPath}
				onOpenChange={setIsCreateVaultOpen}
			/>
			<h1 className="text-2xl font-bold">Cortex</h1>
			<Badge variant="secondary">{version}</Badge>
			<p className="pt-2.5">Open a vault to get started</p>
			<p className="text-[11px] text-text-disabled pb-2.5">
				<Button onClick={handleOpenVault}>Open Vault</Button>
			</p>
			<div className="pt-2.5">
				<h3 className="pb-2.5 text-center">Recent vaults</h3>
				<ul>
					{recentVaults.map((vault) => (
						<li
							className="flex items-center gap-2 p-2.5 rounded hover:bg-bg-secondary cursor-pointer list-none"
							key={vault.path}
							onClick={() => openVault(vault.path)}
							onKeyDown={(e) => e.key === "Enter" && openVault(vault.path)}
						>
							<div className="flex items-center gap-2 flex-col">
								<span className="flex items-center gap-1.5 font-bold">
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
									{vault.name}
								</span>
								<span>{vault.path}</span>
							</div>
							<EllipsisVertical size={18} />
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}
