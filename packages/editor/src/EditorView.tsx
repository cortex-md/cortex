import { EditorState, type Extension, Transaction } from "@codemirror/state"
import { EditorView as CMEditorView } from "@codemirror/view"
import { useEffect, useRef } from "react"
import {
	baseExtensions,
	DEFAULT_EDITOR_CONFIG,
	type EditorConfig,
	reconfigureEditor,
} from "./extensions"

export interface CursorInfo {
	line: number
	col: number
	offset: number
}

export type EditorScrollMode = "internal" | "parent"

interface Props {
	content: string
	filePath: string
	editorConfig?: EditorConfig
	livePreview?: boolean
	resolveImageUrl?: (src: string, filePath: string) => string
	extraExtensions?: Extension[]
	scrollMode?: EditorScrollMode
	onChange: (content: string) => void
	onCursorChange?: (cursor: CursorInfo) => void
	onViewReady?: (view: CMEditorView) => void
}

export function EditorView({
	content,
	filePath,
	editorConfig = DEFAULT_EDITOR_CONFIG,
	livePreview = true,
	resolveImageUrl,
	extraExtensions,
	scrollMode = "internal",
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

		const view = new CMEditorView({
			state: EditorState.create({
				doc: content,
				extensions: [
					...baseExtensions(editorConfigRef.current, {
						livePreview,
						resolveImageUrl,
						filePath,
						scrollMode,
					}),
					...(extraExtensions ?? []),
					CMEditorView.updateListener.of((update) => {
						const remoteUpdate = update.transactions.some((transaction) =>
							transaction.annotation(Transaction.remote),
						)
						if (update.docChanged && !remoteUpdate) {
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
		reconfigureEditor(view, editorConfig, scrollMode)
	}, [editorConfig, scrollMode])

	useEffect(() => {
		const view = viewRef.current
		if (!view) return
		const currentContent = view.state.doc.toString()
		if (filePath === filePathRef.current && currentContent === content) return
		filePathRef.current = filePath
		view.dispatch({
			changes: { from: 0, to: view.state.doc.length, insert: content },
			annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
		})
	}, [filePath, content])

	return <div ref={containerRef} className={`editor-view editor-view-${scrollMode}-scroll`} />
}
