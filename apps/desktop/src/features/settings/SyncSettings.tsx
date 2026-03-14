import { useAuthStore, useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import { Badge, Button, Field, FieldLabel, Input, Separator, Switch } from "@cortex/ui"
import { Cloud, CloudOff, Link, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { DeviceManager } from "../sync/DeviceManager"
import { InvitesPanel } from "../sync/InvitesPanel"
import { MembersPanel } from "../sync/MembersPanel"
import { VaultLinkModal } from "../sync/VaultLinkModal"

interface ServerSectionProps {
	selfHosted: boolean
	onSelfHostChange: (val: boolean) => void
}

function ServerSection({ selfHosted, onSelfHostChange }: ServerSectionProps) {
	const { serverUrl, saveServerUrl } = useAuthStore()
	const [inputValue, setInputValue] = useState(serverUrl)
	const [saved, setSaved] = useState(false)

	useEffect(() => {
		setInputValue(serverUrl)
	}, [serverUrl])

	const handleSave = async () => {
		await saveServerUrl(inputValue.trim())
		setSaved(true)
		setTimeout(() => setSaved(false), 2000)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") handleSave()
	}

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Server
			</h3>
			<Field>
				<FieldLabel>Self-hosted sync</FieldLabel>
				<Switch checked={selfHosted} onCheckedChange={onSelfHostChange} />
			</Field>
			{selfHosted && (
				<Field>
					<FieldLabel htmlFor="server-url">Sync URL</FieldLabel>
					<div className="flex gap-2">
						<Input
							id="server-url"
							type="url"
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="http://localhost:8080"
						/>
						<Button variant="secondary" size="sm" onClick={handleSave} className="shrink-0">
							{saved ? "Saved" : "Save"}
						</Button>
					</div>
				</Field>
			)}
		</div>
	)
}

export function SyncSection() {
	const { authenticated } = useAuthStore()
	const { vault } = useVaultStore()
	const { linkedVaultId, loadLink } = useRemoteVaultStore()
	const { engineState } = useSyncStore()
	const [linkModalOpen, setLinkModalOpen] = useState(false)
	const [selfHosted, setSelfHosted] = useState(false)

	useEffect(() => {
		if (vault?.path) {
			loadLink(vault.path)
		}
	}, [vault?.path, loadLink])

	const showContent = authenticated || selfHosted

	return (
		<section>
			<ServerSection selfHosted={selfHosted} onSelfHostChange={setSelfHosted} />

			{!showContent && (
				<>
					<Separator className="my-4" />
					<div className="flex flex-col items-center gap-3 py-8">
						<CloudOff size={32} className="text-text-muted" />
						<p className="text-text-muted text-center text-sm">
							Sign in or enable self-hosted sync to use sync features
						</p>
					</div>
				</>
			)}

			{showContent && (
				<>
					<Separator className="my-4" />

					<div className="mb-6">
						<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
							Vault Link
						</h3>
						<div className="flex items-center gap-3 py-2">
							{linkedVaultId ? (
								<>
									<Cloud size={16} className="text-accent" />
									<div className="flex flex-col min-w-0 flex-1">
										<span className="font-medium">Linked to remote vault</span>
										<span className="text-text-muted truncate">{linkedVaultId}</span>
									</div>
									{engineState === "live" && (
										<Badge variant="outline" className="py-1">
											Synced
										</Badge>
									)}
									{(engineState === "connecting" ||
										engineState === "authenticating" ||
										engineState === "syncing" ||
										engineState === "recovering") && (
										<Loader2 size={14} className="animate-spin text-text-muted" />
									)}
								</>
							) : (
								<>
									<CloudOff size={16} className="text-text-muted" />
									<span className="text-text-muted flex-1">Not linked to any remote vault</span>
								</>
							)}
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setLinkModalOpen(true)}
								className="h-7 px-2"
							>
								<Link size={12} />
								{linkedVaultId ? "Change" : "Link"}
							</Button>
						</div>
					</div>

					<Separator className="my-4" />

					<div className="mb-6">
						<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
							Devices
						</h3>
						<DeviceManager />
					</div>

					<Separator className="my-4" />

					<div className="mb-6">
						<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
							My Invites
						</h3>
						<InvitesPanel />
					</div>

					{linkedVaultId && (
						<>
							<Separator className="my-4" />
							<div className="mb-6">
								<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
									Vault Members & Invites
								</h3>
								<MembersPanel vaultId={linkedVaultId} />
							</div>
						</>
					)}

					<VaultLinkModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
				</>
			)}
		</section>
	)
}
