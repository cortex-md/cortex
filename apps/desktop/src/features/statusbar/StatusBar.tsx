import type { EditorMode } from "@cortex/core"

interface CursorPosition {
	line: number
	col: number
}

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

interface StatusItem {
	id: string
	label: string
	onClick?: () => void
}

interface Props {
	filePath: string | null
	cursor: CursorPosition | null
	mode: EditorMode
	onModeChange: (mode: EditorMode) => void
	leftItems?: StatusItem[]
	rightItems?: StatusItem[]
}

export function StatusBar({ filePath, cursor, mode, onModeChange, leftItems, rightItems }: Props) {
	const fileName = filePath ? (filePath.split("/").pop() ?? filePath) : null

	return (
		<output className="app-statusbar" aria-live="polite">
			<div className="statusbar-left">
				{fileName && <span className="statusbar-item statusbar-filename">{fileName}</span>}
				{leftItems?.map((item) =>
					item.onClick ? (
						<button
							key={item.id}
							type="button"
							className="statusbar-item statusbar-btn"
							onClick={item.onClick}
						>
							{item.label}
						</button>
					) : (
						<span key={item.id} className="statusbar-item">
							{item.label}
						</span>
					),
				)}
			</div>

			<div className="statusbar-sep" />

			<div className="statusbar-right">
				{cursor && (
					<span className="statusbar-item statusbar-cursor">
						Ln {cursor.line + 1}, Col {cursor.col + 1}
					</span>
				)}
				{rightItems?.map((item) =>
					item.onClick ? (
						<button
							key={item.id}
							type="button"
							className="statusbar-item statusbar-btn"
							onClick={item.onClick}
						>
							{item.label}
						</button>
					) : (
						<span key={item.id} className="statusbar-item">
							{item.label}
						</span>
					),
				)}
				<button
					type="button"
					className="statusbar-item statusbar-btn"
					onClick={() => onModeChange(NEXT_MODE[mode])}
					title="Cycle editor mode"
				>
					{MODE_LABELS[mode]}
				</button>
			</div>
		</output>
	)
}
