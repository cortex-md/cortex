import { useAuthStore, useRemoteVaultStore, useSyncStore, useVaultStore } from "@cortex/core"
import {
	AlertTriangleIcon,
	CheckCircleIcon,
	CloudIcon,
	CloudOffIcon,
	LinkIcon,
	LoaderIcon,
	LockIcon,
	RefreshCwIcon,
} from "lucide-react"
import { useState } from "react"
import { SyncLogsModal } from "./SyncLogsModal"
import { VaultLinkModal } from "./VaultLinkModal"

export function SyncIndicator() {
	const {
		engineState,
		syncingFiles,
		initialSyncProgress,
		initialSyncComplete,
		vekRequired,
		lastSyncedAt,
		error,
	} = useSyncStore()
	const authenticated = useAuthStore((s) => s.authenticated)
	const selfHosted = useAuthStore((s) => s.selfHosted)
	const vault = useVaultStore((s) => s.vault)
	const linkedVaultId = useRemoteVaultStore((s) => s.linkedVaultId)
	const activeSyncCount = Object.values(syncingFiles).filter((s) => !s.startsWith("error:")).length
	const [unlockModalOpen, setUnlockModalOpen] = useState(false)
	const [linkModalOpen, setLinkModalOpen] = useState(false)
	const [logsOpen, setLogsOpen] = useState(false)

	const hasAuth = authenticated || selfHosted

	if (vekRequired) {
		return (
			<>
				<button
					type="button"
					className="statusbar-item flex items-center gap-1.5 cursor-pointer text-status-warning hover:opacity-80"
					onClick={() => setUnlockModalOpen(true)}
				>
					<LockIcon className="w-3 h-3" />
					<span>Unlock Required</span>
				</button>
				<VaultLinkModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} unlockMode />
			</>
		)
	}

	if (engineState === "denied") {
		return (
			<>
				<button
					type="button"
					className="statusbar-item flex items-center gap-1.5 cursor-pointer text-destructive hover:opacity-80"
					onClick={() => setLogsOpen(true)}
				>
					<AlertTriangleIcon className="w-3 h-3" />
					<span>Access Denied</span>
				</button>
				<SyncLogsModal open={logsOpen} onOpenChange={setLogsOpen} />
			</>
		)
	}

	if (error && engineState !== "live" && engineState !== "idle") {
		return (
			<>
				<button
					type="button"
					className="statusbar-item flex items-center gap-1.5 cursor-pointer text-destructive hover:opacity-80"
					onClick={() => setLogsOpen(true)}
				>
					<AlertTriangleIcon className="w-3 h-3" />
					<span>Sync Error</span>
				</button>
				<SyncLogsModal open={logsOpen} onOpenChange={setLogsOpen} />
			</>
		)
	}

	if (engineState === "idle" && hasAuth && vault && !linkedVaultId) {
		return (
			<>
				<button
					type="button"
					className="statusbar-item flex items-center gap-1.5 cursor-pointer text-text-muted hover:text-text-primary"
					onClick={() => setLinkModalOpen(true)}
				>
					<LinkIcon className="w-3 h-3" />
					<span>Set up sync</span>
				</button>
				<VaultLinkModal open={linkModalOpen} onOpenChange={setLinkModalOpen} />
			</>
		)
	}

	if (engineState === "idle") return null

	const renderSyncButton = (children: React.ReactNode) => (
		<>
			<button
				type="button"
				className="statusbar-item flex items-center gap-1.5 cursor-pointer hover:opacity-80"
				onClick={() => setLogsOpen(true)}
			>
				{children}
			</button>
			<SyncLogsModal open={logsOpen} onOpenChange={setLogsOpen} />
		</>
	)

	if (initialSyncProgress && !initialSyncComplete) {
		const { total, completed } = initialSyncProgress
		const label = total > 0 ? `Syncing ${completed}/${total} files...` : "Syncing..."
		return renderSyncButton(
			<>
				<CloudIcon className="w-3.5 h-3.5" />
				<LoaderIcon className="w-3 h-3 animate-spin" />
				<span>{label}</span>
			</>,
		)
	}

	if (activeSyncCount > 0) {
		return renderSyncButton(
			<>
				<LoaderIcon className="w-3 h-3 animate-spin" />
				<span>Syncing {activeSyncCount} file(s)...</span>
			</>,
		)
	}

	const isPollingActive = engineState === "offline" && lastSyncedAt !== null

	const stateConfig = {
		connecting: { icon: RefreshCwIcon, label: "Connecting...", className: "animate-spin" },
		authenticating: {
			icon: RefreshCwIcon,
			label: "Authenticating...",
			className: "animate-spin",
		},
		syncing: { icon: LoaderIcon, label: "Syncing...", className: "animate-spin" },
		live: { icon: CheckCircleIcon, label: "Synced", className: "" },
		offline: {
			icon: isPollingActive ? CheckCircleIcon : CloudOffIcon,
			label: isPollingActive ? "Synced" : "Offline",
			className: "",
		},
		recovering: { icon: RefreshCwIcon, label: "Recovering...", className: "animate-spin" },
	} as const

	const config = stateConfig[engineState as keyof typeof stateConfig]
	if (!config) return null

	const Icon = config.icon

	return renderSyncButton(
		<>
			<Icon className={`w-3 h-3 ${config.className}`} />
			<span>{config.label}</span>
		</>,
	)
}
