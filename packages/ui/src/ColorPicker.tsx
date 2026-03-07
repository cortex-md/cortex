import type { HTMLAttributes } from "react"

const PRESET_COLORS = [
	"#ef4444",
	"#f97316",
	"#f59e0b",
	"#84cc16",
	"#22c55e",
	"#14b8a6",
	"#06b6d4",
	"#3b82f6",
	"#6366f1",
	"#8b5cf6",
	"#a855f7",
	"#ec4899",
	"#f43f5e",
	"#78716c",
]

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
	value: string | null
	onChange: (color: string | null) => void
}

export function ColorPicker({ value, onChange, className = "", ...rest }: Props) {
	return (
		<div className={`color-picker ${className}`} {...rest}>
			<div className="color-picker-swatches">
				{PRESET_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						className={`color-picker-swatch ${value === color ? "active" : ""}`}
						style={{ backgroundColor: color }}
						onClick={() => onChange(value === color ? null : color)}
						aria-label={color}
					/>
				))}
			</div>
			<div className="color-picker-custom">
				<input
					type="color"
					value={value ?? "#3b82f6"}
					onChange={(e) => onChange(e.target.value)}
					className="color-picker-input"
				/>
				<span className="color-picker-hex">{value ?? "None"}</span>
			</div>
		</div>
	)
}
