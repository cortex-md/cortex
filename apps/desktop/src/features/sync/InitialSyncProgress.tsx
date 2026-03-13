import { useSyncStore } from "@cortex/core"
import { Progress, Spinner } from "@cortex/ui"

export function InitialSyncProgress() {
	const initialSyncProgress = useSyncStore((s) => s.initialSyncProgress)
	const initialSyncComplete = useSyncStore((s) => s.initialSyncComplete)

	if (!initialSyncProgress || initialSyncComplete) return null

	const { total, completed, phase } = initialSyncProgress
	const percent = total > 0 ? Math.round((completed / total) * 100) : 0

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
			<div className="flex flex-col items-center gap-4 rounded-lg bg-bg-primary p-8 shadow-xl border border-border min-w-[320px]">
				<Spinner className="size-6 text-brand" />
				<div className="text-sm font-medium text-text-primary">Syncing vault...</div>
				<div className="text-xs text-text-muted">{phase}</div>
				<div className="w-full">
					<Progress value={percent} className="h-2" />
				</div>
				<div className="text-xs text-text-muted">
					{completed} / {total} files ({percent}%)
				</div>
			</div>
		</div>
	)
}
