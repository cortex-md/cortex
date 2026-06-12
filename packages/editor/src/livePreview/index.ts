import type { Extension } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import "./styles.css"
import { createLivePreviewBlockField } from "./blockState"
import { createVisibleDecorationsPlugin } from "./visibleDecorations"

export function livePreviewExtension(
	resolveImageUrl?: (src: string, filePath: string) => string,
	filePath?: string,
): Extension {
	const imageResolver = resolveImageUrl ?? ((src) => src)
	const currentFilePath = filePath ?? ""
	const blockField = createLivePreviewBlockField(imageResolver, currentFilePath)

	return [
		EditorView.editorAttributes.of({ class: "markdown-surface" }),
		blockField,
		createVisibleDecorationsPlugin(blockField),
	]
}

export { getLivePreviewMetrics, resetLivePreviewMetrics } from "./metrics"
