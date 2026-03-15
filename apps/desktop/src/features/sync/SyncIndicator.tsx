import { useSyncStore } from "@cortex/core"
import {
	CheckCircleIcon,
	CloudIcon,
	CloudOffIcon,
	LoaderIcon,
	LockIcon,
	RefreshCwIcon,
} from "lucide-react"
import { useState } from "react"
import { VaultLinkModal } from "./VaultLinkModal"

export function SyncIndicator() {
	const {
		engineState,
		syncingFiles,
		initialSyncProgress,
		initialSyncComplete,
		vekRequired,
		lastSyncedAt,
	} = useSyncStore()
	const activeSyncCount = Object.keys(syncingFiles).length
	const [unlockModalOpen, setUnlockModalOpen] = useState(false)

	if (engineState === "idle" && !vekRequired) return null

	if (vekRequired) {
		return (
			<>
				<button
					type="button"
					className="statusbar-item flex items-center gap-1.5 cursor-pointer hover:opacity-80"
					onClick={() => setUnlockModalOpen(true)}
				>
					<LockIcon className="w-3 h-3" />
					<span>Unlock Required</span>
				</button>
				<VaultLinkModal open={unlockModalOpen} onOpenChange={setUnlockModalOpen} unlockMode />
			</>
		)
	}

	if (initialSyncProgress && !initialSyncComplete) {
		const { total, completed } = initialSyncProgress
		const label = total > 0 ? `Syncing ${completed}/${total} files...` : "Syncing..."
		return (
			<div className="statusbar-item flex items-center gap-1.5">
				<CloudIcon className="w-3.5 h-3.5" />
				<LoaderIcon className="w-3 h-3 animate-spin" />
				<span>{label}</span>
			</div>
		)
	}

	if (activeSyncCount > 0) {
		return (
			<div className="statusbar-item flex items-center gap-1.5">
				<LoaderIcon className="w-3 h-3 animate-spin" />
				<span>Syncing {activeSyncCount} file(s)...</span>
			</div>
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

	return (
		<div className="statusbar-item flex items-center gap-1.5">
			<Icon className={`w-3 h-3 ${config.className}`} />
			<span>{config.label}</span>
		</div>
	)
}
