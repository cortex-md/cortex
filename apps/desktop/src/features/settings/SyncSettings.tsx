import {
	DEFAULT_SYNC_SERVER_URL,
	useAuthStore,
	useDevicesStore,
	useRemoteVaultStore,
	useSyncStore,
	useUIStore,
	useVaultStore,
} from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
	Input,
	Switch,
} from "@cortex/ui"
import {
	ChevronRight,
	ClipboardCopy,
	Clock3,
	Cloud,
	CloudOff,
	Download,
	FileText,
	Link,
	Loader2,
	LogIn,
	MonitorSmartphone,
} from "lucide-react"
import {
	type ChangeEvent,
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useMemo,
	useState,
} from "react"
import { MembersPanel } from "../sync/MembersPanel"
import { VaultLinkModal } from "../sync/VaultLinkModal"
import { ExcludedPathsSettings } from "./ExcludedPathsSettings"
import {
	SettingsField,
	SettingsGroup,
	SettingsGroupContent,
	SettingsPage,
	SettingsSection,
} from "./SettingsPrimitives"

export type SyncSettingsView = "overview" | "preferences" | "members" | "self-host"

interface SelfHostedEnvironmentField {
	key: string
	label: string
	defaultValue: string
	secret?: boolean
}

interface SelfHostedEnvironmentSubsection {
	id: string
	label: string
	fields: SelfHostedEnvironmentField[]
}

interface SelfHostedEnvironmentGroup {
	id: string
	label: string
	description: string
	sections: SelfHostedEnvironmentSubsection[]
}

const selfHostedEnvironmentGroups: SelfHostedEnvironmentGroup[] = [
	{
		id: "server",
		label: "Server",
		description: "Runtime, sync limits, collaboration, operations, and subscriptions.",
		sections: [
			{
				id: "runtime",
				label: "Runtime",
				fields: [
					{ key: "CORTEX_SERVER_HOST", label: "Host", defaultValue: "0.0.0.0" },
					{ key: "CORTEX_SERVER_PORT", label: "Port", defaultValue: "8080" },
					{
						key: "CORTEX_SERVER_SHUTDOWN_TIMEOUT",
						label: "Shutdown timeout",
						defaultValue: "15s",
					},
				],
			},
			{
				id: "sync-limits",
				label: "Sync limits",
				fields: [
					{
						key: "CORTEX_SYNC_MAX_DELTAS_BEFORE_SNAPSHOT",
						label: "Deltas before snapshot",
						defaultValue: "10",
					},
					{
						key: "CORTEX_SYNC_MAX_DELTA_SIZE_RATIO",
						label: "Delta size ratio",
						defaultValue: "0.5",
					},
					{
						key: "CORTEX_SYNC_MAX_FILE_SIZE",
						label: "Max file size",
						defaultValue: "104857600",
					},
					{
						key: "CORTEX_SYNC_MAX_SNAPSHOTS_PER_FILE",
						label: "Snapshots per file",
						defaultValue: "50",
					},
					{
						key: "CORTEX_SYNC_EVENT_RETENTION",
						label: "Event retention",
						defaultValue: "720h",
					},
				],
			},
			{
				id: "collaboration",
				label: "Collaboration",
				fields: [
					{
						key: "CORTEX_COLLAB_MAX_PEERS_PER_ROOM",
						label: "Max peers per room",
						defaultValue: "10",
					},
					{
						key: "CORTEX_COLLAB_FLUSH_INTERVAL",
						label: "Flush interval",
						defaultValue: "10s",
					},
				],
			},
			{
				id: "operations",
				label: "Operations",
				fields: [
					{ key: "CORTEX_METRICS_ENABLED", label: "Metrics enabled", defaultValue: "true" },
					{ key: "CORTEX_METRICS_PATH", label: "Metrics path", defaultValue: "/metrics" },
					{
						key: "CORTEX_RATE_LIMIT_REQUESTS_PER_SECOND",
						label: "Requests per second",
						defaultValue: "100",
					},
					{ key: "CORTEX_RATE_LIMIT_BURST", label: "Burst", defaultValue: "200" },
				],
			},
			{
				id: "subscription",
				label: "Subscription",
				fields: [
					{
						key: "CORTEX_SUBSCRIPTION_ENABLED",
						label: "Enabled",
						defaultValue: "false",
					},
					{
						key: "CORTEX_SUBSCRIPTION_API_KEY",
						label: "API key",
						defaultValue: "",
						secret: true,
					},
					{
						key: "CORTEX_SUBSCRIPTION_PRODUCT_ID",
						label: "Product ID",
						defaultValue: "",
					},
					{
						key: "CORTEX_SUBSCRIPTION_CACHE_TTL",
						label: "Cache TTL",
						defaultValue: "5m",
					},
				],
			},
		],
	},
	{
		id: "database",
		label: "Database",
		description: "PostgreSQL connection and pool sizing.",
		sections: [
			{
				id: "database",
				label: "Database",
				fields: [
					{
						key: "CORTEX_DATABASE_URL",
						label: "PostgreSQL URL",
						defaultValue: "postgres://cortex:cortex@localhost:5432/cortex_sync?sslmode=disable",
					},
					{ key: "CORTEX_DATABASE_MAX_CONNS", label: "Max connections", defaultValue: "25" },
					{ key: "CORTEX_DATABASE_MIN_CONNS", label: "Min connections", defaultValue: "5" },
				],
			},
		],
	},
	{
		id: "authentication",
		label: "Authentication",
		description: "Access tokens, refresh lifetime, and issuer identity.",
		sections: [
			{
				id: "authentication",
				label: "Authentication",
				fields: [
					{
						key: "CORTEX_AUTH_ACCESS_TOKEN_SECRET",
						label: "Access token secret",
						defaultValue: "change-me-in-production",
						secret: true,
					},
					{
						key: "CORTEX_AUTH_ACCESS_TOKEN_EXPIRY",
						label: "Access token expiry",
						defaultValue: "15m",
					},
					{
						key: "CORTEX_AUTH_REFRESH_TOKEN_EXPIRY",
						label: "Refresh token expiry",
						defaultValue: "2160h",
					},
					{ key: "CORTEX_AUTH_ISSUER", label: "Issuer", defaultValue: "cortex-sync" },
				],
			},
		],
	},
	{
		id: "storage",
		label: "Storage",
		description: "S3-compatible snapshot and asset storage.",
		sections: [
			{
				id: "storage",
				label: "Storage",
				fields: [
					{ key: "CORTEX_S3_PROVIDER", label: "Provider", defaultValue: "minio" },
					{ key: "CORTEX_S3_ENDPOINT", label: "Endpoint", defaultValue: "localhost:9000" },
					{
						key: "CORTEX_S3_ACCESS_KEY",
						label: "Access key",
						defaultValue: "minioadmin",
						secret: true,
					},
					{
						key: "CORTEX_S3_SECRET_KEY",
						label: "Secret key",
						defaultValue: "minioadmin",
						secret: true,
					},
					{ key: "CORTEX_S3_BUCKET", label: "Bucket", defaultValue: "cortex-snapshots" },
					{ key: "CORTEX_S3_USE_SSL", label: "Use SSL", defaultValue: "false" },
					{ key: "CORTEX_S3_REGION", label: "Region", defaultValue: "us-east-1" },
				],
			},
		],
	},
]

const selfHostedEnvironmentFields = selfHostedEnvironmentGroups.flatMap((group) =>
	group.sections.flatMap((section) => section.fields),
)

function syncSecretKey(vaultId: string, key: string): string {
	return `sync-env-secret:${vaultId}:${key}`
}

function buildEnvironmentFile(
	values: Record<string, string>,
	secrets: Record<string, string>,
): string {
	return selfHostedEnvironmentFields
		.map((field) => {
			const value = field.secret ? secrets[field.key] : values[field.key]
			return `${field.key}=${value || field.defaultValue}`
		})
		.join("\n")
}

function SignedOutNotice() {
	const closeSettings = useUIStore((s) => s.closeSettings)
	const openAuth = useUIStore((s) => s.openAuth)
	const serverUrl = useRemoteVaultStore((s) => s.syncConfig.serverUrl)

	const handleSignIn = () => {
		closeSettings()
		openAuth("login", "sync")
	}

	return (
		<Alert>
			<LogIn />
			<AlertTitle>Sign in to connect</AlertTitle>
			<AlertDescription>
				<div className="flex flex-col gap-3">
					<p>Sync is enabled for this vault. Sign in to {serverUrl} to link a remote vault.</p>
					<Button size="sm" className="w-fit" onClick={handleSignIn}>
						Sign in
					</Button>
				</div>
			</AlertDescription>
		</Alert>
	)
}

function SyncDisabledNotice({ description }: { description: string }) {
	return (
		<Alert>
			<CloudOff />
			<AlertTitle>Sync is disabled</AlertTitle>
			<AlertDescription>{description}</AlertDescription>
		</Alert>
	)
}

function SyncToggleSection() {
	const vault = useVaultStore((s) => s.vault)
	const syncEnabled = useRemoteVaultStore((s) => s.syncConfig.enabled)
	const setSyncEnabled = useRemoteVaultStore((s) => s.setSyncEnabled)

	return (
		<SettingsSection
			title="Sync"
			description="Enable or disable sync for this vault without changing its remote link."
		>
			<SettingsGroup>
				<SettingsField label="Enable sync for this vault" htmlFor="sync-enabled">
					<Switch
						id="sync-enabled"
						checked={syncEnabled}
						onCheckedChange={(checked) => vault?.path && setSyncEnabled(vault.path, checked)}
					/>
				</SettingsField>
			</SettingsGroup>
		</SettingsSection>
	)
}

function ServerSection() {
	const vault = useVaultStore((s) => s.vault)
	const linkedVaultId = useRemoteVaultStore((s) => s.linkedVaultId)
	const syncConfig = useRemoteVaultStore((s) => s.syncConfig)
	const saveServerUrl = useRemoteVaultStore((s) => s.saveServerUrl)
	const setSelfHosted = useRemoteVaultStore((s) => s.setSelfHosted)
	const unlinkVault = useRemoteVaultStore((s) => s.unlinkVault)
	const [inputValue, setInputValue] = useState(syncConfig.serverUrl ?? DEFAULT_SYNC_SERVER_URL)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		setInputValue(syncConfig.serverUrl ?? DEFAULT_SYNC_SERVER_URL)
	}, [syncConfig.serverUrl])

	const handleSave = async () => {
		const trimmed = inputValue.trim().replace(/\/+$/, "")
		if (!vault?.path || !trimmed || trimmed === syncConfig.serverUrl) return
		if (linkedVaultId) {
			const confirmed = await getPlatform().dialog.showConfirm({
				title: "Change sync server?",
				message: "Changing the sync server will unlink this vault from its current remote vault.",
				confirmLabel: "Change server",
				cancelLabel: "Keep current server",
				destructive: true,
			})
			if (!confirmed) {
				setInputValue(syncConfig.serverUrl ?? DEFAULT_SYNC_SERVER_URL)
				return
			}
			await unlinkVault(vault.path)
		}
		setSaving(true)
		try {
			await saveServerUrl(vault.path, trimmed)
		} finally {
			setSaving(false)
		}
	}

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === "Enter") handleSave()
	}

	const handleSelfHostToggle = async (checked: boolean) => {
		if (!vault?.path) return
		await setSelfHosted(vault.path, checked)
	}

	return (
		<SettingsSection
			title="Connection"
			description="Choose Cortex Cloud or point this vault at a self-hosted sync server."
		>
			<SettingsGroup>
				<SettingsField label="Self-hosted sync" htmlFor="self-hosted-sync">
					<Switch
						id="self-hosted-sync"
						checked={syncConfig.selfHosted}
						onCheckedChange={handleSelfHostToggle}
					/>
				</SettingsField>
				<SettingsField
					label="Sync URL"
					description="Remote vaults and login use this URL for the active vault only."
					htmlFor="server-url"
					controlClassName="max-w-[440px]"
				>
					<div className="flex gap-2">
						<Input
							id="server-url"
							type="url"
							value={inputValue}
							onChange={(event: ChangeEvent<HTMLInputElement>) => setInputValue(event.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={DEFAULT_SYNC_SERVER_URL}
							disabled={saving}
						/>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleSave}
							disabled={saving || inputValue.trim() === syncConfig.serverUrl}
							className="shrink-0"
						>
							{saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
						</Button>
					</div>
				</SettingsField>
			</SettingsGroup>
		</SettingsSection>
	)
}

function SyncPreferencesSection() {
	const { syncPreferences, updateSyncPreference } = useSyncStore()

	const preferences = [
		{ key: "ignoreImages" as const, label: "Ignore images" },
		{ key: "syncSettings" as const, label: "App settings" },
		{ key: "syncHotkeys" as const, label: "Keyboard shortcuts" },
		{ key: "syncWorkspace" as const, label: "Workspace layout" },
		{ key: "syncPluginMetadata" as const, label: "Plugin configuration" },
		{ key: "syncThemeMetadata" as const, label: "Theme configuration" },
	]

	return (
		<SettingsSection title="Content" description="Choose what sync should include for this vault.">
			<SettingsGroup>
				{preferences.map(({ key, label }) => (
					<SettingsField key={key} label={label} htmlFor={`sync-preference-${key}`}>
						<Switch
							id={`sync-preference-${key}`}
							checked={syncPreferences[key]}
							onCheckedChange={(checked) => updateSyncPreference(key, checked)}
						/>
					</SettingsField>
				))}
			</SettingsGroup>
		</SettingsSection>
	)
}

const SYNC_STATUS_LABELS: Record<string, string> = {
	idle: "Idle",
	authenticating: "Authenticating",
	connecting: "Connecting",
	syncing: "Syncing",
	live: "Synced",
	offline: "Offline",
	recovering: "Recovering",
	denied: "Access denied",
}

function formatLastSyncedAt(lastSyncedAt: number | null): string {
	if (!lastSyncedAt) return "Not synced yet"
	const elapsedMinutes = Math.floor((Date.now() - lastSyncedAt) / 60000)
	if (elapsedMinutes <= 0) return "Just now"
	if (elapsedMinutes < 60) {
		return `${elapsedMinutes} ${elapsedMinutes === 1 ? "minute" : "minutes"} ago`
	}
	const elapsedHours = Math.floor(elapsedMinutes / 60)
	if (elapsedHours < 24) {
		return `${elapsedHours} ${elapsedHours === 1 ? "hour" : "hours"} ago`
	}
	return new Date(lastSyncedAt).toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	})
}

function syncStatusClassName(engineState: string): string {
	if (engineState === "live") {
		return "border-status-success-border bg-status-success-background text-status-success-foreground"
	}
	if (engineState === "offline") {
		return "border-status-warning-border bg-status-warning-background text-status-warning-foreground"
	}
	if (engineState === "denied") {
		return "border-status-error-border bg-status-error-background text-status-error-foreground"
	}
	return "border-border bg-muted text-muted-foreground"
}

interface SyncOverviewMetricProps {
	icon: typeof Clock3
	label: string
	value: string
}

function SyncOverviewMetric({ icon: Icon, label, value }: SyncOverviewMetricProps) {
	return (
		<div className="flex min-w-0 items-center gap-3 px-4 py-3">
			<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
				<Icon className="size-3.5" />
			</div>
			<div className="min-w-0">
				<p className="m-0 text-[11px] leading-4 text-muted-foreground">{label}</p>
				<p className="m-0 truncate text-[13px] font-medium leading-5 text-foreground">{value}</p>
			</div>
		</div>
	)
}

function VaultLinkSection({
	linkedVaultId,
	vaultName,
	remoteVaultRole,
	engineState,
	lastSyncedAt,
	connectedDeviceCount,
	devicesLoading,
	noteCount,
	onOpenLink,
}: {
	linkedVaultId: string | null
	vaultName: string
	remoteVaultRole?: string
	engineState: string
	lastSyncedAt: number | null
	connectedDeviceCount: number
	devicesLoading: boolean
	noteCount: number
	onOpenLink: () => void
}) {
	return (
		<SettingsSection
			title="Remote vault"
			description="The remote vault linked to this local vault."
		>
			<SettingsGroup>
				<SettingsGroupContent className="p-0">
					{linkedVaultId ? (
						<div>
							<div className="flex items-center gap-3 px-4 py-4">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand-text">
									<Cloud className="size-4" />
								</div>
								<div className="min-w-0 flex-1">
									<p className="m-0 truncate text-sm font-semibold text-foreground">{vaultName}</p>
									<p className="m-0 mt-0.5 text-xs text-muted-foreground">Linked remote vault</p>
								</div>
								{remoteVaultRole && (
									<Badge variant="outline" className="capitalize">
										{remoteVaultRole}
									</Badge>
								)}
								<Badge
									variant="outline"
									className={`capitalize ${syncStatusClassName(engineState)}`}
								>
									{(engineState === "connecting" ||
										engineState === "authenticating" ||
										engineState === "syncing" ||
										engineState === "recovering") && <Loader2 className="animate-spin" />}
									{SYNC_STATUS_LABELS[engineState] ?? engineState}
								</Badge>
								<Button variant="ghost" size="sm" onClick={onOpenLink}>
									<Link />
									Change
								</Button>
							</div>
							<div className="grid border-t border-settings-group-divider sm:grid-cols-3 sm:divide-x sm:divide-settings-group-divider">
								<SyncOverviewMetric
									icon={Clock3}
									label="Last synced"
									value={formatLastSyncedAt(lastSyncedAt)}
								/>
								<SyncOverviewMetric
									icon={MonitorSmartphone}
									label="Connected devices"
									value={
										devicesLoading
											? "Loading"
											: `${connectedDeviceCount} ${
													connectedDeviceCount === 1 ? "device" : "devices"
												}`
									}
								/>
								<SyncOverviewMetric
									icon={FileText}
									label="Synced notes"
									value={`${noteCount} ${noteCount === 1 ? "note" : "notes"}`}
								/>
							</div>
						</div>
					) : (
						<div className="flex items-center gap-3 px-4 py-4">
							<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
								<CloudOff className="size-4" />
							</div>
							<span className="flex-1 text-muted-foreground">
								Link or create a remote vault to start syncing.
							</span>
							<Button variant="default" size="sm" onClick={onOpenLink}>
								<Link />
								Link vault
							</Button>
						</div>
					)}
				</SettingsGroupContent>
			</SettingsGroup>
		</SettingsSection>
	)
}

function MembersSection({
	authenticated,
	linkedVaultId,
	linkedVaultRole,
	onOpenLink,
}: {
	authenticated: boolean
	linkedVaultId: string | null
	linkedVaultRole?: string
	onOpenLink: () => void
}) {
	if (!authenticated) {
		return (
			<SettingsPage>
				<SignedOutNotice />
			</SettingsPage>
		)
	}

	if (!linkedVaultId) {
		return (
			<SettingsPage>
				<VaultLinkSection
					linkedVaultId={linkedVaultId}
					vaultName="Remote vault"
					remoteVaultRole={linkedVaultRole}
					engineState="idle"
					lastSyncedAt={null}
					connectedDeviceCount={0}
					devicesLoading={false}
					noteCount={0}
					onOpenLink={onOpenLink}
				/>
			</SettingsPage>
		)
	}

	return (
		<SettingsPage>
			<SettingsSection
				title="Members"
				description="Manage access and invitations for the linked remote vault."
			>
				<SettingsGroup>
					<SettingsGroupContent>
						<MembersPanel vaultId={linkedVaultId} currentUserRole={linkedVaultRole} />
					</SettingsGroupContent>
				</SettingsGroup>
			</SettingsSection>
		</SettingsPage>
	)
}

interface SelfHostedEnvironmentDisclosureProps {
	group: SelfHostedEnvironmentGroup
	open: boolean
	values: Record<string, string>
	secrets: Record<string, string>
	onOpenChange: (open: boolean) => void
	onFieldChange: (field: SelfHostedEnvironmentField, value: string) => Promise<void>
}

function SelfHostedEnvironmentDisclosure({
	group,
	open,
	values,
	secrets,
	onOpenChange,
	onFieldChange,
}: SelfHostedEnvironmentDisclosureProps) {
	const fieldCount = group.sections.reduce((count, section) => count + section.fields.length, 0)
	const showSubsectionLabels = group.sections.length > 1

	return (
		<Collapsible open={open} onOpenChange={onOpenChange} className="border-b last:border-b-0">
			<CollapsibleTrigger asChild>
				<Button
					variant="ghost"
					aria-label={group.label}
					className="h-auto w-full justify-between rounded-none px-4 py-3 text-left hover:bg-muted/50 [&[data-state=open]_.self-host-chevron]:rotate-90"
				>
					<div className="min-w-0">
						<p className="m-0 text-[13px] font-medium text-foreground">{group.label}</p>
						<p className="m-0 mt-0.5 truncate text-xs font-normal text-muted-foreground">
							{group.description}
						</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<Badge variant="secondary">{fieldCount}</Badge>
						<ChevronRight className="self-host-chevron size-4 text-muted-foreground transition-transform duration-200" />
					</div>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent
				forceMount
				aria-hidden={!open}
				inert={!open}
				className="grid grid-rows-[0fr] transition-[grid-template-rows,visibility] duration-200 ease-out data-[state=closed]:invisible data-[state=open]:grid-rows-[1fr] data-[state=open]:visible"
			>
				<div className="min-h-0 overflow-hidden border-t border-settings-group-divider">
					{group.sections.map((section) => (
						<div key={section.id}>
							{showSubsectionLabels && (
								<div className="border-b border-settings-group-divider bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
									{section.label}
								</div>
							)}
							<div className="divide-y divide-settings-group-divider">
								{section.fields.map((field) => {
									const value = field.secret
										? (secrets[field.key] ?? "")
										: (values[field.key] ?? "")
									return (
										<SettingsField
											key={field.key}
											label={field.label}
											description={field.key}
											htmlFor={field.key}
											controlClassName="max-w-[420px]"
										>
											<Input
												id={field.key}
												type={field.secret ? "password" : "text"}
												value={value}
												onChange={(event: ChangeEvent<HTMLInputElement>) =>
													void onFieldChange(field, event.target.value)
												}
												placeholder={field.defaultValue}
											/>
										</SettingsField>
									)
								})}
							</div>
						</div>
					))}
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
}

function SelfHostedEnvironmentSection() {
	const vault = useVaultStore((s) => s.vault)
	const syncConfig = useRemoteVaultStore((s) => s.syncConfig)
	const updateSelfHostedEnvironment = useRemoteVaultStore((s) => s.updateSelfHostedEnvironment)
	const [secrets, setSecrets] = useState<Record<string, string>>({})
	const [copied, setCopied] = useState(false)
	const [openGroupId, setOpenGroupId] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false
		async function loadSecrets() {
			if (!vault?.uuid) {
				setSecrets({})
				return
			}
			const platform = getPlatform()
			const entries = await Promise.all(
				selfHostedEnvironmentFields
					.filter((field) => field.secret)
					.map(async (field) => [
						field.key,
						await platform.keychain.get(syncSecretKey(vault.uuid, field.key)),
					]),
			)
			if (cancelled) return
			setSecrets(
				Object.fromEntries(entries.filter((entry): entry is [string, string] => Boolean(entry[1]))),
			)
		}
		loadSecrets()
		return () => {
			cancelled = true
		}
	}, [vault?.uuid])

	const handleFieldChange = async (field: SelfHostedEnvironmentField, value: string) => {
		if (!vault?.path || !vault.uuid) return
		if (field.secret) {
			const platform = getPlatform()
			const key = syncSecretKey(vault.uuid, field.key)
			if (value) {
				await platform.keychain.set(key, value)
			} else {
				await platform.keychain.delete(key)
			}
			setSecrets((previous) => {
				const next = { ...previous }
				if (value) {
					next[field.key] = value
				} else {
					delete next[field.key]
				}
				return next
			})
			return
		}
		await updateSelfHostedEnvironment(vault.path, field.key, value)
	}

	const environmentFile = useMemo(
		() => buildEnvironmentFile(syncConfig.selfHostedEnvironment, secrets),
		[syncConfig.selfHostedEnvironment, secrets],
	)

	const handleCopy = async () => {
		await navigator.clipboard.writeText(environmentFile)
		setCopied(true)
		window.setTimeout(() => setCopied(false), 1200)
	}

	const handleExport = () => {
		const blob = new Blob([environmentFile], { type: "text/plain;charset=utf-8" })
		const url = URL.createObjectURL(blob)
		const link = document.createElement("a")
		link.href = url
		link.download = ".env"
		link.click()
		URL.revokeObjectURL(url)
	}

	return (
		<SettingsSection
			title="Environment"
			description="Values are saved for this vault. Secret values are stored in the OS keychain."
			action={
				<>
					<Button variant="secondary" size="sm" onClick={handleCopy}>
						<ClipboardCopy size={14} />
						{copied ? "Copied" : "Copy .env"}
					</Button>
					<Button variant="secondary" size="sm" onClick={handleExport}>
						<Download size={14} />
						Export
					</Button>
				</>
			}
		>
			<SettingsGroup>
				{selfHostedEnvironmentGroups.map((group) => (
					<SelfHostedEnvironmentDisclosure
						key={group.id}
						group={group}
						open={openGroupId === group.id}
						values={syncConfig.selfHostedEnvironment}
						secrets={secrets}
						onOpenChange={(open) => setOpenGroupId(open ? group.id : null)}
						onFieldChange={handleFieldChange}
					/>
				))}
			</SettingsGroup>
		</SettingsSection>
	)
}

export function SyncSection({ view = "overview" }: { view?: SyncSettingsView }) {
	const authenticated = useAuthStore((s) => s.authenticated)
	const { vault, files } = useVaultStore()
	const { linkedVaultId, remoteVaults, loadLink, fetchRemoteVaults, syncConfig } =
		useRemoteVaultStore()
	const { engineState, lastSyncedAt } = useSyncStore()
	const deviceEntries = useDevicesStore((state) => state.deviceEntries)
	const devicesLoading = useDevicesStore((state) => state.loading)
	const devicesError = useDevicesStore((state) => state.error)
	const fetchDevices = useDevicesStore((state) => state.fetchDevices)
	const [linkModalOpen, setLinkModalOpen] = useState(false)

	useEffect(() => {
		if (vault?.path) {
			loadLink(vault.path)
		}
	}, [vault?.path, loadLink])

	useEffect(() => {
		if (authenticated && syncConfig.enabled) {
			fetchRemoteVaults()
		}
	}, [authenticated, syncConfig.enabled, fetchRemoteVaults])

	const linkedVault = remoteVaults.find((remoteVault) => remoteVault.id === linkedVaultId)
	const noteCount = useMemo(
		() => files.filter((file) => !file.isDir && file.name.toLowerCase().endsWith(".md")).length,
		[files],
	)
	const connectedDeviceCount = useMemo(
		() => deviceEntries.filter((device) => !device.revoked).length,
		[deviceEntries],
	)

	useEffect(() => {
		if (
			view === "overview" &&
			authenticated &&
			syncConfig.enabled &&
			linkedVaultId &&
			deviceEntries.length === 0 &&
			!devicesLoading &&
			!devicesError
		) {
			fetchDevices()
		}
	}, [
		view,
		authenticated,
		syncConfig.enabled,
		linkedVaultId,
		deviceEntries.length,
		devicesLoading,
		devicesError,
		fetchDevices,
	])

	let content: ReactNode = null

	if (view === "overview") {
		content = (
			<SettingsPage>
				<SyncToggleSection />
				{syncConfig.enabled && !authenticated && <SignedOutNotice />}
				{syncConfig.enabled && authenticated && (
					<VaultLinkSection
						linkedVaultId={linkedVaultId}
						vaultName={linkedVault?.name ?? vault?.name ?? "Remote vault"}
						remoteVaultRole={linkedVault?.role}
						engineState={engineState}
						lastSyncedAt={lastSyncedAt}
						connectedDeviceCount={connectedDeviceCount}
						devicesLoading={devicesLoading}
						noteCount={noteCount}
						onOpenLink={() => setLinkModalOpen(true)}
					/>
				)}
			</SettingsPage>
		)
	}

	if (view === "preferences") {
		content = syncConfig.enabled ? (
			<SettingsPage>
				<SyncPreferencesSection />
				<ExcludedPathsSettings />
			</SettingsPage>
		) : (
			<SettingsPage>
				<SyncDisabledNotice description="Enable sync in the Sync page to configure content preferences." />
			</SettingsPage>
		)
	}

	if (view === "members") {
		content = syncConfig.enabled ? (
			<MembersSection
				authenticated={authenticated}
				linkedVaultId={linkedVaultId}
				linkedVaultRole={linkedVault?.role}
				onOpenLink={() => setLinkModalOpen(true)}
			/>
		) : (
			<SettingsPage>
				<SyncDisabledNotice description="Enable sync in the Sync page before managing members." />
			</SettingsPage>
		)
	}

	if (view === "self-host") {
		content = (
			<SettingsPage>
				<ServerSection />
				{syncConfig.selfHosted && <SelfHostedEnvironmentSection />}
			</SettingsPage>
		)
	}

	return (
		<>
			{content}
			<VaultLinkModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
		</>
	)
}
