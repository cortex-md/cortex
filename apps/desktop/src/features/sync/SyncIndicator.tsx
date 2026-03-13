import { useSyncStore } from "@cortex/core"
import { CheckCircleIcon, CloudIcon, CloudOffIcon, LoaderIcon, RefreshCwIcon } from "lucide-react"

export function SyncIndicator() {
	const { engineState, syncingFiles } = useSyncStore()
	const activeSyncCount = Object.keys(syncingFiles).length

	if (engineState === "idle") return null

	const stateConfig = {
		connecting: { icon: RefreshCwIcon, label: "Connecting...", className: "animate-spin" },
		authenticating: { icon: RefreshCwIcon, label: "Authenticating...", className: "animate-spin" },
		syncing: { icon: LoaderIcon, label: "Syncing...", className: "animate-spin" },
		live: { icon: CheckCircleIcon, label: "Synced", className: "" },
		offline: { icon: CloudOffIcon, label: "Offline", className: "" },
		recovering: { icon: RefreshCwIcon, label: "Recovering...", className: "animate-spin" },
	} as const

	const config = stateConfig[engineState as keyof typeof stateConfig]
	if (!config) return null

	const Icon = activeSyncCount > 0 ? LoaderIcon : config.icon
	const label = activeSyncCount > 0 ? `Syncing ${activeSyncCount} file(s)...` : config.label
	const iconClass = activeSyncCount > 0 ? "animate-spin" : config.className

	return (
		<div className="flex items-center gap-1.5 text-text-muted text-xs">
			<CloudIcon className="w-3.5 h-3.5" />
			<Icon className={`w-3 h-3 ${iconClass}`} />
			<span>{label}</span>
		</div>
	)
}
