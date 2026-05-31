import {
	useAuthStore,
	useRemoteVaultStore,
	useSyncStore,
	useUIStore,
	useVaultStore,
} from "@cortex/core"
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Field,
	FieldLabel,
	Input,
	Separator,
	Switch,
} from "@cortex/ui"
import { Cloud, CloudOff, Link, Loader2, LogIn, LogOut, User } from "lucide-react"
import { type ChangeEvent, type KeyboardEvent, useEffect, useState } from "react"
import { DeviceManager } from "../sync/DeviceManager"
import { InvitesPanel } from "../sync/InvitesPanel"
import { MembersPanel } from "../sync/MembersPanel"
import { VaultLinkModal } from "../sync/VaultLinkModal"
import { ExcludedPathsSettings } from "./ExcludedPathsSettings"

function SignedOutNotice() {
	const closeSettings = useUIStore((s) => s.closeSettings)
	const openAuth = useUIStore((s) => s.openAuth)

	const handleSignIn = () => {
		closeSettings()
		openAuth("login", "sync")
	}

	return (
		<Alert>
			<LogIn />
			<AlertTitle>Sign in to use sync</AlertTitle>
			<AlertDescription>
				<div className="flex flex-col gap-3">
					<p>Sync is available after you sign in to your Cortex account.</p>
					<Button size="sm" className="w-fit" onClick={handleSignIn}>
            Sign in
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	)
}

function AccountSection() {
	const { user, logout } = useAuthStore()

	if (!user) return null

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

function SyncToggleSection() {
	const { syncEnabled, setSyncEnabled } = useAuthStore()

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Sync
			</h3>
			<Field orientation="horizontal" className="items-center justify-between py-2">
				<FieldLabel htmlFor="sync-enabled">Enable sync</FieldLabel>
				<Switch id="sync-enabled" checked={syncEnabled} onCheckedChange={setSyncEnabled} />
			</Field>
		</div>
	)
}

function ServerSection() {
	const { serverUrl, saveServerUrl, selfHosted, setSelfHosted } = useAuthStore()
	const vault = useVaultStore((s) => s.vault)
	const [inputValue, setInputValue] = useState(serverUrl)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		setInputValue(serverUrl)
	}, [serverUrl])

	const handleSave = async () => {
		const trimmed = inputValue.trim()
		if (!trimmed || trimmed === serverUrl) return
		setSaving(true)
		await saveServerUrl(trimmed)
		if (vault?.path) {
			const platform = (await import("@cortex/platform")).getPlatform()
			await platform.remoteVault.updateSyncConfig(vault.path, "serverUrl", trimmed)
		}
		setSaving(false)
	}

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") handleSave()
	}

	const handleSelfHostToggle = async (checked: boolean) => {
		await setSelfHosted(checked)
		if (vault?.path) {
			const platform = (await import("@cortex/platform")).getPlatform()
			await platform.remoteVault.updateSyncConfig(vault.path, "selfHosted", checked)
		}
	}

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Server
			</h3>
			<Field orientation="horizontal" className="items-center justify-between py-2">
				<FieldLabel htmlFor="self-hosted-sync">Self-hosted sync</FieldLabel>
				<Switch id="self-hosted-sync" checked={selfHosted} onCheckedChange={handleSelfHostToggle} />
			</Field>
			{selfHosted && (
				<Field>
					<FieldLabel htmlFor="server-url">Sync URL</FieldLabel>
					<div className="flex gap-2">
						<Input
							id="server-url"
							type="url"
							value={inputValue}
							onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder="http://localhost:8080"
							disabled={saving}
						/>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleSave}
							disabled={saving}
							className="shrink-0"
						>
							{saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
						</Button>
					</div>
				</Field>
			)}
		</div>
	)
}

function SyncPreferencesSection() {
	const { syncPreferences, updateSyncPreference } = useSyncStore()

	const preferences = [
		{ key: "syncSettings" as const, label: "Sync app settings" },
		{ key: "syncHotkeys" as const, label: "Sync keyboard shortcuts" },
		{ key: "syncWorkspace" as const, label: "Sync workspace layout" },
		{ key: "syncPluginMetadata" as const, label: "Sync plugin configuration" },
		{ key: "syncThemeMetadata" as const, label: "Sync theme configuration" },
	]

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Sync Preferences
			</h3>
			{preferences.map(({ key, label }) => (
				<Field key={key} orientation="horizontal" className="items-center justify-between py-2">
					<FieldLabel>{label}</FieldLabel>
					<Switch
						checked={syncPreferences[key]}
						onCheckedChange={(checked) => updateSyncPreference(key, checked)}
					/>
				</Field>
			))}
		</div>
	)
}

function VaultLinkSection({
	linkedVaultId,
	remoteVaultRole,
	engineState,
	onOpenLink,
}: {
	linkedVaultId: string | null
	remoteVaultRole?: string
	engineState: string
	onOpenLink: () => void
}) {
	return (
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
						{remoteVaultRole && (
							<Badge variant="outline" className="py-1 capitalize">
								{remoteVaultRole}
							</Badge>
						)}
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
						<span className="text-text-muted flex-1">
							Link or create a remote vault to start syncing.
						</span>
					</>
				)}
				<Button variant="ghost" size="sm" onClick={onOpenLink} className="h-7 px-2">
					<Link size={12} />
					{linkedVaultId ? "Change" : "Link"}
				</Button>
			</div>
		</div>
	)
}

export function SyncSection() {
	const authenticated = useAuthStore((s) => s.authenticated)
	const syncEnabled = useAuthStore((s) => s.syncEnabled)
	const { vault } = useVaultStore()
	const { linkedVaultId, remoteVaults, loadLink, fetchRemoteVaults } = useRemoteVaultStore()
	const { engineState } = useSyncStore()
	const [linkModalOpen, setLinkModalOpen] = useState(false)

	useEffect(() => {
		if (vault?.path) {
			loadLink(vault.path)
		}
	}, [vault?.path, loadLink])

	useEffect(() => {
		if (authenticated && syncEnabled) {
			fetchRemoteVaults()
		}
	}, [authenticated, syncEnabled, fetchRemoteVaults])

	if (!authenticated) {
		return (
			<section>
				<SignedOutNotice />
			</section>
		)
	}

	const linkedVault = remoteVaults.find((v) => v.id === linkedVaultId)

	return (
		<section>
			<AccountSection />

			<Separator className="my-4" />

			<SyncToggleSection />

			{syncEnabled && (
				<>
					<Separator className="my-4" />

					<VaultLinkSection
						linkedVaultId={linkedVaultId}
						remoteVaultRole={linkedVault?.role}
						engineState={engineState}
						onOpenLink={() => setLinkModalOpen(true)}
					/>

					<VaultLinkModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />

					{linkedVaultId && (
						<>
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

							<Separator className="my-4" />

							<div className="mb-6">
								<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
									Vault Members & Invites
								</h3>
								<MembersPanel vaultId={linkedVaultId} currentUserRole={linkedVault?.role} />
							</div>

							<Separator className="my-4" />

							<SyncPreferencesSection />

							<Separator className="my-4" />

							<ExcludedPathsSettings />

							<Separator className="my-4" />

							<ServerSection />
						</>
					)}
				</>
			)}
		</section>
	)
}
