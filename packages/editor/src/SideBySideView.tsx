import type { EditorView as CMEditorView } from "@codemirror/view"
import type { RendererPlugin } from "@cortex/renderer"
import { useCallback, useRef } from "react"
import { EditorView } from "./EditorView"
import type { EditorConfig } from "./extensions"
import { ReadingView } from "./ReadingView"

interface Props {
	content: string
	filePath: string
	editorConfig?: EditorConfig
	rendererPlugins?: RendererPlugin[]
	onChange: (content: string) => void
	onWikiLinkClick?: (target: string) => void
}

export function SideBySideView({
	content,
	filePath,
	editorConfig,
	rendererPlugins,
	onChange,
	onWikiLinkClick,
}: Props) {
	const readingPanelRef = useRef<HTMLDivElement>(null)
	const editorScrollRef = useRef<CMEditorView | null>(null)
	const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const handleViewReady = useCallback((view: CMEditorView) => {
		editorScrollRef.current = view
	}, [])

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

	return (
		<div className="side-by-side-view" onScroll={handleEditorScroll}>
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
					plugins={rendererPlugins}
					onWikiLinkClick={onWikiLinkClick}
				/>
			</div>
		</div>
	)
}
