import { useAppStore, useVaultStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import { Button, isValidLucideIconName, LucideIcon } from "@cortex/ui"
import { EllipsisVertical, Vault } from "lucide-react"
import { useState } from "react"
import { CreateVaultModal } from "../vault/CreateVaultModal"

export function EmptyVaultLayout() {
	const { openVault, recentVaults } = useVaultStore()
	const { version } = useAppStore()

	const [isVaultModal, setIsVaultModal] = useState(false);

	const handleOpenVault = async () => {
    const path = await getPlatform().dialog.pickFolder();

    setIsVaultModal(true);
	}

	return (
		<div className="editor-empty-state">
      {isVaultModal && (
        <CreateVaultModal
        onClose={() => setIsVaultModal(false)}
        />
			)}
      <h1>
        Cortex
			</h1>
			<span>v.{version}</span>
			<p style={{ paddingTop: "10px" }} >Open a vault to get started</p>
			<p className="editor-empty-hint">
				<Button  variant="primary" onClick={handleOpenVault}>
					Open Vault
				</Button>
			</p>
			<div className="recent-vaults-container">
				<h3 style={{ paddingBottom: "10px", textAlign: "center" }}>Recent vaults</h3>
				<ul>
					{recentVaults.map((vault) => (
						<li style={{ listStyle: "none" }} className="recent-vault-item" key={vault.path}>
							<div className="recent-vault-item-path">
								<span className="recent-vault-name">
									{vault.color && (
										<span className="vault-color-dot" style={{ backgroundColor: vault.color }} />
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
