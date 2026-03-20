import { useAuthStore, useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import {
	Badge,
	Button,
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	Input,
	Separator,
	Switch,
} from "@cortex/ui"
import { Cloud, CloudOff, Link, Loader2, LogOut, User } from "lucide-react"
import { type FormEvent, useEffect, useState } from "react"
import { DeviceManager } from "../sync/DeviceManager"
import { InvitesPanel } from "../sync/InvitesPanel"
import { MembersPanel } from "../sync/MembersPanel"
import { VaultLinkModal } from "../sync/VaultLinkModal"
import { ExcludedPathsSettings } from "./ExcludedPathsSettings"

type AuthFormView = "login" | "register"

function AccountSection() {
	const { user, authenticated, login, register, logout, loading, error, clearError } =
		useAuthStore()
	const [authFormView, setAuthFormView] = useState<AuthFormView>("login")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [displayName, setDisplayName] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [validationError, setValidationError] = useState<string | null>(null)

	const resetForm = () => {
		setEmail("")
		setPassword("")
		setDisplayName("")
		setConfirmPassword("")
		setValidationError(null)
		clearError()
	}

	const handleLogin = async (e: FormEvent) => {
		e.preventDefault()
		clearError()
		await login(email, password).catch(() => {})
	}

	const handleRegister = async (e: FormEvent) => {
		e.preventDefault()
		clearError()
		setValidationError(null)

		if (password !== confirmPassword) {
			setValidationError("Passwords do not match")
			return
		}
		if (password.length < 8) {
			setValidationError("Password must be at least 8 characters")
			return
		}

		await register(email, password, displayName).catch(() => {})
	}

	if (authenticated && user) {
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

	const displayError = validationError || error

	if (authFormView === "register") {
		return (
			<div className="mb-6">
				<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
					Create Account
				</h3>
				<form onSubmit={handleRegister}>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="register-name">Display Name</FieldLabel>
							<Input
								id="register-name"
								type="text"
								placeholder="John Doe"
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="register-email">Email</FieldLabel>
							<Input
								id="register-email"
								type="email"
								placeholder="you@example.com"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="register-password">Password</FieldLabel>
							<Input
								id="register-password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								disabled={loading}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="register-confirm">Confirm Password</FieldLabel>
							<Input
								id="register-confirm"
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								required
								disabled={loading}
							/>
							<FieldDescription>Must be at least 8 characters long.</FieldDescription>
						</Field>
						{displayError && <FieldError className="text-center">{displayError}</FieldError>}
						<Field>
							<Button type="submit" className="w-full" disabled={loading}>
								{loading ? "Creating account..." : "Create Account"}
							</Button>
							<FieldDescription className="text-center">
								Already have an account?{" "}
								<button
									type="button"
									className="underline hover:text-accent-hover"
									onClick={() => {
										resetForm()
										setAuthFormView("login")
									}}
								>
									Sign in
								</button>
							</FieldDescription>
						</Field>
					</FieldGroup>
				</form>
			</div>
		)
	}

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Account
			</h3>
			<form onSubmit={handleLogin}>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="login-email">Email</FieldLabel>
						<Input
							id="login-email"
							type="email"
							placeholder="you@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
							disabled={loading}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="login-password">Password</FieldLabel>
						<Input
							id="login-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							required
							disabled={loading}
						/>
					</Field>
					{error && <FieldError className="text-center">{error}</FieldError>}
					<Field>
						<Button type="submit" className="w-full" disabled={loading}>
							{loading ? "Signing in..." : "Sign In"}
						</Button>
						<FieldDescription className="text-center">
							Don&apos;t have an account?{" "}
							<button
								type="button"
								className="underline hover:text-accent-hover"
								onClick={() => {
									resetForm()
									setAuthFormView("register")
								}}
							>
								Create one
							</button>
						</FieldDescription>
					</Field>
				</FieldGroup>
			</form>
		</div>
	)
}

function SyncToggleSection() {
	const { syncEnabled, setSyncEnabled, authenticated, selfHosted } = useAuthStore()

	if (!authenticated && !selfHosted) return null

	return (
		<div className="mb-6">
			<h3 className="text-[10px] font-bold m-0 mb-3 text-text-muted uppercase tracking-wide">
				Sync
			</h3>
			<Field>
				<FieldLabel>Enable sync</FieldLabel>
				<Switch checked={syncEnabled} onCheckedChange={setSyncEnabled} />
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

	const handleKeyDown = (e: React.KeyboardEvent) => {
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
			<Field>
				<FieldLabel>Self-hosted sync</FieldLabel>
				<Switch checked={selfHosted} onCheckedChange={handleSelfHostToggle} />
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
				<Field key={key}>
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

export function SyncSection() {
	const { authenticated, selfHosted } = useAuthStore()
	const { vault } = useVaultStore()
	const { linkedVaultId, remoteVaults, loadLink, fetchRemoteVaults } = useRemoteVaultStore()
	const { engineState } = useSyncStore()
	const [linkModalOpen, setLinkModalOpen] = useState(false)

	useEffect(() => {
		if (vault?.path) {
			loadLink(vault.path)
		}
	}, [vault?.path, loadLink])

	const showContent = authenticated || selfHosted

	useEffect(() => {
		if (showContent) {
			fetchRemoteVaults()
		}
	}, [showContent, fetchRemoteVaults])

	return (
		<section>
			<AccountSection />

			<Separator className="my-4" />

			<ServerSection />

			<SyncToggleSection />

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
								<MembersPanel
									vaultId={linkedVaultId}
									currentUserRole={remoteVaults.find((v) => v.id === linkedVaultId)?.role}
								/>
							</div>
						</>
					)}

					<Separator className="my-4" />

					<SyncPreferencesSection />

					<Separator className="my-4" />

					<ExcludedPathsSettings />

					<VaultLinkModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
				</>
			)}
		</section>
	)
}
