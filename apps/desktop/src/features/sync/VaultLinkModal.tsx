import { useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
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
import { Cloud, Link, Lock, Plus, Unlink, Users } from "lucide-react"
import { useEffect, useState } from "react"

interface VaultLinkModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	unlockMode?: boolean
}

type EncryptionStep = "none" | "enter-password" | "create-password"

export function VaultLinkModal({ open, onOpenChange, unlockMode }: VaultLinkModalProps) {
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
	const { checkVaultEncryption, createVaultKey, unlockVaultKey } = useSyncStore()

	const [showCreate, setShowCreate] = useState(false)
	const [newVaultName, setNewVaultName] = useState("")
	const [newVaultDescription, setNewVaultDescription] = useState("")
	const [encryptionStep, setEncryptionStep] = useState<EncryptionStep>("none")
	const [pendingVaultId, setPendingVaultId] = useState<string | null>(null)
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [encryptionError, setEncryptionError] = useState<string | null>(null)
	const [encryptionLoading, setEncryptionLoading] = useState(false)

	useEffect(() => {
		if (open) {
			if (unlockMode && linkedVaultId) {
				setPendingVaultId(linkedVaultId)
				setEncryptionStep("enter-password")
			} else {
				fetchRemoteVaults()
				if (vault?.path) {
					loadLink(vault.path)
				}
			}
		} else {
			setEncryptionStep("none")
			setPendingVaultId(null)
			setPassword("")
			setConfirmPassword("")
			setEncryptionError(null)
			setEncryptionLoading(false)
		}
	}, [open, vault?.path, fetchRemoteVaults, loadLink, unlockMode, linkedVaultId])

	const handleLink = async (remoteVaultId: string) => {
		if (!vault?.path) return
		setEncryptionLoading(true)
		setEncryptionError(null)
		try {
			const status = await checkVaultEncryption(remoteVaultId)
			setPendingVaultId(remoteVaultId)
			if (status.hasKey) {
				setEncryptionStep("enter-password")
			} else {
				setEncryptionStep("create-password")
			}
		} catch (e) {
			setEncryptionError(String(e))
		} finally {
			setEncryptionLoading(false)
		}
	}

	const handleUnlockSubmit = async () => {
		if (!pendingVaultId || !password || !vault?.path) return
		setEncryptionLoading(true)
		setEncryptionError(null)
		try {
			await unlockVaultKey(pendingVaultId, password)
			if (!unlockMode) {
				await linkVault(vault.path, pendingVaultId)
			}
			onOpenChange(false)
		} catch (e) {
			const msg = String(e)
			setEncryptionError(msg.includes("Wrong password") ? "Wrong password" : msg)
		} finally {
			setEncryptionLoading(false)
		}
	}

	const handleCreateSubmit = async () => {
		if (!pendingVaultId || !password || !vault?.path) return
		if (password !== confirmPassword) {
			setEncryptionError("Passwords do not match")
			return
		}
		if (password.length < 8) {
			setEncryptionError("Password must be at least 8 characters")
			return
		}
		setEncryptionLoading(true)
		setEncryptionError(null)
		try {
			await createVaultKey(pendingVaultId, password)
			await linkVault(vault.path, pendingVaultId)
			onOpenChange(false)
		} catch (e) {
			setEncryptionError(String(e))
		} finally {
			setEncryptionLoading(false)
		}
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
			await handleLink(created.id)
		} catch (e) {
			console.error(e)
		}
	}

	const linkedVault = remoteVaults.find((v) => v.id === linkedVaultId)

	if (encryptionStep === "enter-password") {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock size={16} />
							Enter Encryption Password
						</DialogTitle>
						<DialogDescription>
							This vault is encrypted. Enter your password to unlock it.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 py-2">
						<div>
							<Label htmlFor="unlock-password" className="text-xs">
								Password
							</Label>
							<Input
								id="unlock-password"
								type="password"
								className="h-8 text-xs mt-1"
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
									e.key === "Enter" && handleUnlockSubmit()
								}
								autoFocus
							/>
						</div>
						{encryptionError && <p className="text-xs text-red-500">{encryptionError}</p>}
					</div>
					<DialogFooter>
						<DialogClose asChild>
							<Button variant="ghost" size="sm" className="text-xs">
								Cancel
							</Button>
						</DialogClose>
						<Button
							variant="default"
							size="sm"
							className="text-xs"
							onClick={handleUnlockSubmit}
							disabled={!password || encryptionLoading}
						>
							{encryptionLoading ? "Unlocking..." : "Unlock"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		)
	}

	if (encryptionStep === "create-password") {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[400px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<Lock size={16} />
							Create Encryption Password
						</DialogTitle>
						<DialogDescription>
							Create a password to encrypt this vault. You will need this password on every device.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 py-2">
						<div>
							<Label htmlFor="create-password" className="text-xs">
								Password
							</Label>
							<Input
								id="create-password"
								type="password"
								className="h-8 text-xs mt-1"
								value={password}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
								autoFocus
							/>
						</div>
						<div>
							<Label htmlFor="confirm-password" className="text-xs">
								Confirm Password
							</Label>
							<Input
								id="confirm-password"
								type="password"
								className="h-8 text-xs mt-1"
								value={confirmPassword}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setConfirmPassword(e.target.value)
								}
								onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
									e.key === "Enter" && handleCreateSubmit()
								}
							/>
						</div>
						{encryptionError && <p className="text-xs text-red-500">{encryptionError}</p>}
					</div>
					<DialogFooter>
						<Button
							variant="ghost"
							size="sm"
							className="text-xs"
							onClick={() => {
								setEncryptionStep("none")
								setPendingVaultId(null)
								setPassword("")
								setConfirmPassword("")
								setEncryptionError(null)
							}}
						>
							Back
						</Button>
						<Button
							variant="default"
							size="sm"
							className="text-xs"
							onClick={handleCreateSubmit}
							disabled={!password || !confirmPassword || encryptionLoading}
						>
							{encryptionLoading ? "Creating..." : "Create & Link"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		)
	}

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
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setNewVaultName(e.target.value)
								}
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
								onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
									setNewVaultDescription(e.target.value)
								}
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
						{loading || encryptionLoading ? (
							<p className="text-xs text-text-muted py-2">
								{encryptionLoading ? "Checking encryption..." : "Loading remote vaults..."}
							</p>
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
										className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/10 text-left w-full"
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
										{rv.memberCount > 1 && (
											<span className="flex items-center gap-1 text-[10px] text-text-muted shrink-0">
												<Users size={10} />
												{rv.memberCount}
											</span>
										)}
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

				{(error || encryptionError) && (
					<p className="text-xs text-red-500">{encryptionError || error}</p>
				)}

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
