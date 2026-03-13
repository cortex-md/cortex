import type { ConflictInfo, ConflictResolution } from "@cortex/platform"
import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	ScrollArea,
} from "@cortex/ui"

interface Props {
	conflict: ConflictInfo
	onResolve: (resolution: ConflictResolution) => void
	onClose: () => void
}

export function ConflictDiffView({ conflict, onResolve, onClose }: Props) {
	const localContent = conflict.localContent ?? "(binary or unavailable)"
	const remoteContent = conflict.remoteContent ?? "(binary or unavailable)"
	const hasContent = conflict.localContent !== null && conflict.remoteContent !== null

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="md:max-w-[900px] md:max-h-[600px] flex flex-col gap-0 p-0">
				<DialogTitle className="px-4 py-3 text-sm font-medium border-b border-border">
					Conflict: {conflict.filePath}
				</DialogTitle>
				<DialogDescription className="sr-only">
					Side-by-side comparison of local and remote versions
				</DialogDescription>

				<div className="flex flex-1 overflow-hidden min-h-0">
					<div className="flex-1 flex flex-col border-r border-border min-w-0">
						<div className="px-3 py-1.5 text-xs font-medium text-text-muted border-b border-border bg-bg-secondary">
							Local
						</div>
						<ScrollArea className="flex-1">
							<pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words text-text-primary">
								{localContent}
							</pre>
						</ScrollArea>
					</div>
					<div className="flex-1 flex flex-col min-w-0">
						<div className="px-3 py-1.5 text-xs font-medium text-text-muted border-b border-border bg-bg-secondary">
							Remote
						</div>
						<ScrollArea className="flex-1">
							<pre className="p-3 text-xs font-mono whitespace-pre-wrap break-words text-text-primary">
								{remoteContent}
							</pre>
						</ScrollArea>
					</div>
				</div>

				<div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
					<Button variant="ghost" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="secondary" size="sm" onClick={() => onResolve({ type: "keep_local" })}>
						Keep Local
					</Button>
					<Button variant="secondary" size="sm" onClick={() => onResolve({ type: "keep_remote" })}>
						Keep Remote
					</Button>
					{hasContent && (
						<Button
							variant="default"
							size="sm"
							onClick={() => onResolve({ type: "merged", content: localContent })}
						>
							Keep Local as Merged
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
