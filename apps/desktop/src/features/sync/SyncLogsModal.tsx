import { type SyncLogEntry, type SyncLogLevel, useSyncLogStore } from "@cortex/core"
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ToggleGroup,
	ToggleGroupItem,
} from "@cortex/ui"
import { CopyIcon, TrashIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const LEVEL_FILTERS: Array<{ label: string; value: SyncLogLevel | "all" }> = [
	{ label: "All", value: "all" },
	{ label: "Info", value: "info" },
	{ label: "Warn", value: "warn" },
	{ label: "Error", value: "error" },
]

const LEVEL_STYLES: Record<SyncLogLevel, string> = {
	info: "border-border bg-muted text-muted-foreground",
	warn: "border-status-warning-border bg-status-warning-background text-status-warning-foreground",
	error: "border-status-error-border bg-status-error-background text-status-error-foreground",
}

function formatTimestamp(timestamp: number): string {
	const date = new Date(timestamp)
	return date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
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
	const filteredEntryCount = filteredEntries.length

	useEffect(() => {
		const scrollContainer = scrollRef.current
		if (scrollContainer && filteredEntryCount > 0) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight
		}
	}, [filteredEntryCount])

	const handleCopyToClipboard = () => {
		const text = entries.map(formatEntryAsText).join("\n")
		void navigator.clipboard.writeText(text)
	}

	return (
		<DialogContent className="flex max-h-[min(680px,calc(100vh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
			<DialogHeader className="shrink-0 gap-1 border-b border-border px-5 py-4 pr-12">
				<DialogTitle className="text-base leading-5">Sync logs</DialogTitle>
				<DialogDescription className="text-xs leading-[18px]">
					Review connection changes, file operations, warnings, and errors from this session.
				</DialogDescription>
			</DialogHeader>

			<div className="shrink-0 px-5 py-3">
				<ToggleGroup
					type="single"
					value={filter}
					onValueChange={(value) => value && setFilter(value as SyncLogLevel | "all")}
					variant="outline"
					size="sm"
					aria-label="Filter sync logs"
				>
					{LEVEL_FILTERS.map((levelFilter) => (
						<ToggleGroupItem
							key={levelFilter.value}
							value={levelFilter.value}
							aria-label={`Show ${levelFilter.label.toLowerCase()} logs`}
							className="h-6 px-2.5 text-xs"
						>
							{levelFilter.label}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</div>

			<div
				ref={scrollRef}
				data-slot="sync-log-list"
				className="min-h-0 flex-1 overflow-y-auto border-y border-border bg-background"
			>
				{filteredEntryCount === 0 ? (
					<div className="flex min-h-56 flex-col items-center justify-center gap-1 px-6 text-center">
						<p className="m-0 text-sm font-medium text-foreground">
							{entries.length === 0 ? "No sync activity yet" : "No matching log entries"}
						</p>
						<p className="m-0 max-w-sm text-xs leading-[18px] text-muted-foreground">
							{entries.length === 0
								? "Connection and file activity will appear here while sync is running."
								: "Choose another level to review the rest of this session."}
						</p>
					</div>
				) : (
					<div className="divide-y divide-border">
						{filteredEntries.map((entry) => (
							<LogEntry key={entry.id} entry={entry} />
						))}
					</div>
				)}
			</div>

			<DialogFooter className="shrink-0 items-center justify-between gap-3 px-5 py-3 sm:justify-between">
				<p className="m-0 text-xs tabular-nums text-muted-foreground">
					{filteredEntryCount === entries.length
						? `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`
						: `${filteredEntryCount} of ${entries.length} entries`}
				</p>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={clear}
						disabled={entries.length === 0}
						className="text-muted-foreground"
					>
						<TrashIcon />
						Clear
					</Button>
					<Button
						variant="secondary"
						size="sm"
						onClick={handleCopyToClipboard}
						disabled={entries.length === 0}
					>
						<CopyIcon />
						Copy all
					</Button>
				</div>
			</DialogFooter>
		</DialogContent>
	)
}

function LogEntry({ entry }: { entry: SyncLogEntry }) {
	return (
		<div
			data-level={entry.level}
			className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 gap-y-2 px-5 py-3 transition-colors hover:bg-muted/40"
		>
			<time
				dateTime={new Date(entry.timestamp).toISOString()}
				title={new Date(entry.timestamp).toLocaleString()}
				className="pt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground"
			>
				{formatTimestamp(entry.timestamp)}
			</time>
			<Badge
				variant="outline"
				className={`h-5 min-w-12 px-1.5 text-[10px] uppercase tracking-wide ${LEVEL_STYLES[entry.level]}`}
			>
				{entry.level}
			</Badge>
			<div className="min-w-0">
				<p className="m-0 break-words text-[13px] leading-5 text-foreground">{entry.message}</p>
				{entry.metadata && (
					<div className="mt-1.5 flex flex-wrap gap-1.5">
						{Object.entries(entry.metadata).map(([key, value]) => (
							<span
								key={key}
								className="rounded-[6px] border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted-foreground"
							>
								{key}={value}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
