import { useRemoteVaultStore, useVaultStore } from "@cortex/core"
import {
	Button,
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	Input,
	Label,
} from "@cortex/ui"
import { Cloud, Link, Plus, Unlink } from "lucide-react"
import { useEffect, useState } from "react"

interface VaultLinkModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function VaultLinkModal({ open, onOpenChange }: VaultLinkModalProps) {
	const { vault } = useVaultStore()
	const {
		remoteVaults,
		linkedVaultId,
		loading,
		error,
		fetchRemoteVaults,
		createRemoteVault,
		linkVault,
		unlinkVault,
		loadLink,
	} = useRemoteVaultStore()

	const [showCreate, setShowCreate] = useState(false)
	const [newVaultName, setNewVaultName] = useState("")
	const [newVaultDescription, setNewVaultDescription] = useState("")

	useEffect(() => {
		if (open) {
			fetchRemoteVaults()
			if (vault?.path) {
				loadLink(vault.path)
			}
		}
	}, [open, vault?.path, fetchRemoteVaults, loadLink])

	const handleLink = async (remoteVaultId: string) => {
		if (!vault?.path) return
		try {
			await linkVault(vault.path, remoteVaultId)
			onOpenChange(false)
		} catch {}
	}

	const handleUnlink = async () => {
		if (!vault?.path) return
		try {
			await unlinkVault(vault.path)
		} catch {}
	}

	const handleCreate = async () => {
		if (!newVaultName.trim() || !vault?.path) return
		try {
			const created = await createRemoteVault(
				newVaultName.trim(),
				newVaultDescription.trim() || null,
			)
			await linkVault(vault.path, created.id)
			onOpenChange(false)
		} catch (e) {
			console.error(e)
		}
	}

	const linkedVault = remoteVaults.find((v) => v.id === linkedVaultId)

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Link to Remote Vault</DialogTitle>
					<DialogDescription>
						Link this local vault to a remote vault for syncing.
					</DialogDescription>
				</DialogHeader>

				{linkedVaultId && linkedVault ? (
					<div className="flex flex-col gap-3 py-2">
						<div className="flex items-center gap-2 p-3 border border-border rounded-md">
							<Cloud size={16} className="text-accent shrink-0" />
							<div className="flex flex-col min-w-0 flex-1">
								<span className="text-xs font-medium truncate">{linkedVault.name}</span>
								{linkedVault.description && (
									<span className="text-[10px] text-text-muted truncate">
										{linkedVault.description}
									</span>
								)}
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={handleUnlink}
								className="text-xs h-6 px-2 text-red-500 hover:text-red-600"
							>
								<Unlink size={12} />
								Unlink
							</Button>
						</div>
					</div>
				) : showCreate ? (
					<div className="flex flex-col gap-3 py-2">
						<div>
							<Label htmlFor="remote-vault-name" className="text-xs">
								Name
							</Label>
							<Input
								id="remote-vault-name"
								className="h-8 text-xs mt-1"
								placeholder="My Vault"
								value={newVaultName}
								onChange={(e) => setNewVaultName(e.target.value)}
							/>
						</div>
						<div>
							<Label htmlFor="remote-vault-desc" className="text-xs">
								Description (optional)
							</Label>
							<Input
								id="remote-vault-desc"
								className="h-8 text-xs mt-1"
								placeholder="A brief description"
								value={newVaultDescription}
								onChange={(e) => setNewVaultDescription(e.target.value)}
							/>
						</div>
						<div className="flex items-center gap-2 justify-end">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setShowCreate(false)}
								className="text-xs h-7"
							>
								Cancel
							</Button>
							<Button variant="default" size="sm" onClick={handleCreate} className="text-xs h-7">
								Create & Link
							</Button>
						</div>
					</div>
				) : (
					<div className="flex flex-col gap-2 py-2">
						{loading ? (
							<p className="text-xs text-text-muted py-2">Loading remote vaults...</p>
						) : remoteVaults.length === 0 ? (
							<p className="text-xs text-text-muted py-2">
								No remote vaults found. Create one to start syncing.
							</p>
						) : (
							<div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto">
								{remoteVaults.map((rv) => (
									<button
										type="button"
										key={rv.id}
										className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/10 cursor-pointer text-left w-full"
										onClick={() => handleLink(rv.id)}
									>
										<Cloud size={14} className="text-text-muted shrink-0" />
										<div className="flex flex-col min-w-0 flex-1">
											<span className="text-xs font-medium truncate">{rv.name}</span>
											{rv.description && (
												<span className="text-[10px] text-text-muted truncate">
													{rv.description}
												</span>
											)}
										</div>
										<Link size={12} className="text-text-muted shrink-0" />
									</button>
								))}
							</div>
						)}
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setShowCreate(true)}
							className="text-xs h-7 self-start"
						>
							<Plus size={12} />
							Create new remote vault
						</Button>
					</div>
				)}

				{error && <p className="text-xs text-red-500">{error}</p>}

				<DialogFooter>
					<DialogClose asChild>
						<Button variant="ghost" size="sm" className="text-xs">
							Close
						</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
