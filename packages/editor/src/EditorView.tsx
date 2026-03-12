import { EditorState } from "@codemirror/state"
import { EditorView as CMEditorView } from "@codemirror/view"
import { useEffect, useRef } from "react"
import {
	baseExtensions,
	DEFAULT_EDITOR_CONFIG,
	type EditorConfig,
	reconfigureEditor,
} from "./extensions"
import { resolveSyntaxTokens } from "./highlight"

export interface CursorInfo {
	line: number
	col: number
	offset: number
}

interface Props {
	content: string
	filePath: string
	editorConfig?: EditorConfig
	livePreview?: boolean
	onChange: (content: string) => void
	onCursorChange?: (cursor: CursorInfo) => void
	onViewReady?: (view: CMEditorView) => void
}

export function EditorView({
	content,
	filePath,
	editorConfig = DEFAULT_EDITOR_CONFIG,
	livePreview = true,
	onChange,
	onCursorChange,
	onViewReady,
}: Props) {
	const containerRef = useRef<HTMLDivElement>(null)
	const viewRef = useRef<CMEditorView | null>(null)
	const filePathRef = useRef(filePath)
	const onChangeRef = useRef(onChange)
	const onCursorChangeRef = useRef(onCursorChange)
	const onViewReadyRef = useRef(onViewReady)
	const editorConfigRef = useRef(editorConfig)

	onChangeRef.current = onChange
	onCursorChangeRef.current = onCursorChange
	onViewReadyRef.current = onViewReady

	// biome-ignore lint/correctness/useExhaustiveDependencies: CM6 EditorView is mount-once per tab lifecycle
	useEffect(() => {
		if (!containerRef.current) return

		const syntaxTokens = resolveSyntaxTokens()
		const view = new CMEditorView({
			state: EditorState.create({
				doc: content,
				extensions: [
					...baseExtensions(syntaxTokens, editorConfigRef.current, { livePreview }),
					CMEditorView.updateListener.of((update) => {
						if (update.docChanged) {
							onChangeRef.current(update.state.doc.toString())
						}
						if (update.selectionSet || update.docChanged) {
							const cursor = update.state.selection.main.head
							const line = update.state.doc.lineAt(cursor)
							onCursorChangeRef.current?.({
								line: line.number - 1,
								col: cursor - line.from,
								offset: cursor,
							})
						}
					}),
				],
			}),
			parent: containerRef.current,
		})

		viewRef.current = view
		onViewReadyRef.current?.(view)

		return () => {
			view.destroy()
			viewRef.current = null
		}
	}, [])

	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		editorConfigRef.current = editorConfig
		reconfigureEditor(view, editorConfig)
	}, [editorConfig])

	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		if (filePath === filePathRef.current) return

		filePathRef.current = filePath
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: content },
		})
	}, [filePath, content])

	return <div ref={containerRef} style={{ height: "100%", overflow: "hidden" }} />
}
