import { type SyncLogEntry, type SyncLogLevel, useSyncLogStore } from "@cortex/core"
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@cortex/ui"
import { CopyIcon, TrashIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const LEVEL_FILTERS: Array<{ label: string; value: SyncLogLevel | "all" }> = [
	{ label: "All", value: "all" },
	{ label: "Info", value: "info" },
	{ label: "Warn", value: "warn" },
	{ label: "Error", value: "error" },
]

const LEVEL_DOT_COLORS: Record<SyncLogLevel, string> = {
	info: "bg-text-muted",
	warn: "bg-status-warning",
	error: "bg-status-error",
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp)
	return date.toLocaleTimeString("en-US", { hour12: false })
}

function formatEntryAsText(entry: SyncLogEntry): string {
	const time = formatTimestamp(entry.timestamp)
	const meta = entry.metadata
		? ` ${Object.entries(entry.metadata)
				.map(([k, v]) => `${k}=${v}`)
				.join(" ")}`
		: ""
	return `[${time}] [${entry.level.toUpperCase()}] ${entry.message}${meta}`
}

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SyncLogsModal({ open, onOpenChange }: Props) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			{open && <SyncLogsContent />}
		</Dialog>
	)
}

function SyncLogsContent() {
	const { entries, clear } = useSyncLogStore()
	const [filter, setFilter] = useState<SyncLogLevel | "all">("all")
	const scrollRef = useRef<HTMLDivElement>(null)

	const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.level === filter)

	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll to bottom when new entries arrive
	useEffect(() => {
		const el = scrollRef.current
		if (el) el.scrollTop = el.scrollHeight
	}, [filteredEntries.length])

	const handleCopyToClipboard = () => {
		const text = entries.map(formatEntryAsText).join("\n")
		navigator.clipboard.writeText(text)
	}

	return (
		<DialogContent className="sm:max-w-2xl flex flex-col gap-0 p-0 overflow-hidden">
			<DialogHeader className="px-4 pt-4 pb-3">
				<DialogTitle className="text-sm font-medium">Sync Logs</DialogTitle>
				<DialogDescription className="sr-only">
					View sync operation logs and filter by level.
				</DialogDescription>
			</DialogHeader>

			<div className="flex gap-1 px-4 pb-3">
				{LEVEL_FILTERS.map((f) => (
					<button
						key={f.value}
						type="button"
						className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
							filter === f.value
								? "bg-bg-tertiary text-text-primary"
								: "text-text-muted hover:text-text-primary hover:bg-bg-secondary"
						}`}
						onClick={() => setFilter(f.value)}
					>
						{f.label}
					</button>
				))}
			</div>

			<div
				ref={scrollRef}
				className="flex-1 min-h-0 max-h-[400px] overflow-y-auto border-t border-border bg-bg-secondary"
			>
				{filteredEntries.length === 0 ? (
					<p className="text-xs text-text-muted text-center py-12">No sync logs yet</p>
				) : (
					<div className="font-mono text-[11px] leading-relaxed">
						{[...filteredEntries].map((entry) => (
							<LogEntry key={entry.id} entry={entry} />
						))}
					</div>
				)}
			</div>

			<DialogFooter className="px-4 py-3 border-t border-border gap-2">
				<Button
					variant="ghost"
					size="sm"
					onClick={clear}
					className="text-text-muted gap-1.5 h-7 text-xs"
				>
					<TrashIcon className="w-3 h-3" />
					Clear
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={handleCopyToClipboard}
					className="gap-1.5 h-7 text-xs"
				>
					<CopyIcon className="w-3 h-3" />
					Copy
				</Button>
			</DialogFooter>
		</DialogContent>
	)
}

function LogEntry({ entry }: { entry: SyncLogEntry }) {
	return (
		<div className="flex items-start gap-2 px-4 py-1.5 hover:bg-bg-primary/50 border-b border-border/50 last:border-b-0">
			<span className="text-text-disabled shrink-0 pt-0.5 tabular-nums">
				{formatTimestamp(entry.timestamp)}
			</span>
			<span
				className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[5px] ${LEVEL_DOT_COLORS[entry.level]}`}
			/>
			<span className="text-text-primary break-all min-w-0">
				{entry.message}
				{entry.metadata && (
					<span className="text-text-disabled ml-1.5">
						{Object.entries(entry.metadata)
							.map(([k, v]) => `${k}=${v}`)
							.join(" ")}
					</span>
				)}
			</span>
		</div>
	)
}
