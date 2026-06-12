import type { EditorView as CMEditorView } from "@codemirror/view"
import { useCallback, useEffect, useRef } from "react"
import { EditorView } from "./EditorView"
import type { EditorConfig } from "./extensions"
import { ReadingView } from "./ReadingView"

interface Props {
	content: string
	filePath: string
	editorConfig?: EditorConfig
	onChange: (content: string) => void
	onWikiLinkClick?: (target: string) => void
	onExternalLinkClick?: (url: string) => void
}

export function SideBySideView({
	content,
	filePath,
	editorConfig,
	onChange,
	onWikiLinkClick,
	onExternalLinkClick,
}: Props) {
	const readingPanelRef = useRef<HTMLDivElement>(null)
	const editorScrollRef = useRef<CMEditorView | null>(null)
	const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleEditorScroll = useCallback(() => {
		if (syncTimerRef.current) clearTimeout(syncTimerRef.current)

		syncTimerRef.current = setTimeout(() => {
			const editorView = editorScrollRef.current
			const readingPanel = readingPanelRef.current
			if (!editorView || !readingPanel) return

			const editorScroller = editorView.scrollDOM
			const scrollRatio =
				editorScroller.scrollTop /
				Math.max(1, editorScroller.scrollHeight - editorScroller.clientHeight)

			readingPanel.scrollTop =
				scrollRatio * Math.max(0, readingPanel.scrollHeight - readingPanel.clientHeight)
		}, 30)
	}, [])

	const handleViewReady = useCallback(
		(view: CMEditorView) => {
			editorScrollRef.current?.scrollDOM.removeEventListener("scroll", handleEditorScroll)
			editorScrollRef.current = view
			view.scrollDOM.addEventListener("scroll", handleEditorScroll)
		},
		[handleEditorScroll],
	)

	useEffect(() => {
		return () => {
			if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
			editorScrollRef.current?.scrollDOM.removeEventListener("scroll", handleEditorScroll)
		}
	}, [handleEditorScroll])

	return (
		<div className="side-by-side-view">
			<div className="side-by-side-editor">
				<EditorView
					content={content}
					filePath={filePath}
					editorConfig={editorConfig}
					livePreview={false}
					onChange={onChange}
					onViewReady={handleViewReady}
				/>
			</div>
			<div className="side-by-side-preview" ref={readingPanelRef}>
				<ReadingView
					content={content}
					renderDelay={80}
					onWikiLinkClick={onWikiLinkClick}
					onExternalLinkClick={onExternalLinkClick}
				/>
			</div>
		</div>
	)
}
