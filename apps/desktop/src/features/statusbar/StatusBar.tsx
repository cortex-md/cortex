import { type EditorMode, useEditorStore } from "@cortex/core"

const MODE_LABELS: Record<EditorMode, string> = {
	source: "Source",
	"live-preview": "Preview",
	reading: "Reading",
	"side-by-side": "Side by Side",
}

const NEXT_MODE: Record<EditorMode, EditorMode> = {
	source: "live-preview",
	"live-preview": "reading",
	reading: "side-by-side",
	"side-by-side": "source",
}

export function StatusBar() {
	const { activeFilePath, cursor, mode, setMode } = useEditorStore()

	const fileName = activeFilePath ? (activeFilePath.split("/").pop() ?? activeFilePath) : null

	return (
		<div className="app-statusbar">
			<div className="statusbar-left">
				{fileName && <span className="statusbar-item statusbar-filename">{fileName}</span>}
			</div>

			<div className="statusbar-sep" />

			<div className="statusbar-right">
				{cursor && (
					<span className="statusbar-item statusbar-cursor">
						Ln {cursor.line + 1}, Col {cursor.col + 1}
					</span>
				)}
				<button
					type="button"
					className="statusbar-item statusbar-btn"
					onClick={() => setMode(NEXT_MODE[mode])}
					title="Cycle editor mode"
				>
					{MODE_LABELS[mode]}
				</button>
			</div>
		</div>
	)
}
