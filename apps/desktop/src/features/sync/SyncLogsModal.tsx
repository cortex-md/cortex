import { type SyncLogEntry, type SyncLogLevel, useSyncLogStore } from "@cortex/core"
import {
	Badge,
	Button,
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	ScrollArea,
} from "@cortex/ui"
import { CopyIcon, TrashIcon } from "lucide-react"
import { useState } from "react"

const LEVEL_FILTERS: Array<{ label: string; value: SyncLogLevel | "all" }> = [
	{ label: "All", value: "all" },
	{ label: "Info", value: "info" },
	{ label: "Warn", value: "warn" },
	{ label: "Error", value: "error" },
]

const LEVEL_VARIANTS: Record<SyncLogLevel, "default" | "outline" | "destructive"> = {
	info: "default",
	warn: "outline",
	error: "destructive",
}

const LEVEL_COLORS: Record<SyncLogLevel, string> = {
	info: "text-muted-foreground",
	warn: "text-yellow-500",
	error: "text-red-500",
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

	const filteredEntries = filter === "all" ? entries : entries.filter((e) => e.level === filter)

	const handleCopyToClipboard = () => {
		const text = entries.map(formatEntryAsText).join("\n")
		navigator.clipboard.writeText(text)
	}

	return (
		<DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
			<DialogHeader>
				<DialogTitle>Sync Logs</DialogTitle>
			</DialogHeader>

			<div className="flex gap-1">
				{LEVEL_FILTERS.map((f) => (
					<Button
						key={f.value}
						variant={filter === f.value ? "default" : "ghost"}
						size="sm"
						onClick={() => setFilter(f.value)}
					>
						{f.label}
					</Button>
				))}
			</div>

			<ScrollArea className="flex-1 min-h-0 max-h-[50vh] rounded-md w-xl border p-2">
				{filteredEntries.length === 0 ? (
					<p className="text-sm text-muted-foreground text-center py-8">No sync logs yet</p>
				) : (
					<div className="flex flex-col gap-2 text-xs">
						{[...filteredEntries].map((entry) => (
							<div key={entry.id} className="flex gap-2 font-mono py-0.5">
								<span className="text-muted-foreground shrink-0">
									{formatTimestamp(entry.timestamp)}
								</span>
								<span className={`shrink-0 uppercase w-10 ${LEVEL_COLORS[entry.level]}`}>
									<Badge className=							"text-[10px]"variant={LEVEL_VARIANTS[entry.level]}>{entry.level}</Badge>
								</span>
								<span className="text-foreground">{entry.message}</span>
								{entry.metadata && (
									<span className="text-muted-foreground">
										{Object.entries(entry.metadata)
											.map(([k, v]) => `${k}=${v}`)
											.join(" ")}
									</span>
								)}
							</div>
						))}
					</div>
				)}
			</ScrollArea>

			<DialogFooter>
				<Button variant="ghost" size="sm" onClick={clear}>
					<TrashIcon className="w-3.5 h-3.5 mr-1.5" />
					Clear
				</Button>
				<Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
					<CopyIcon className="w-3.5 h-3.5 mr-1.5" />
					Copy to Clipboard
				</Button>
			</DialogFooter>
		</DialogContent>
	)
}
