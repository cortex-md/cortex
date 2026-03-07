interface Props {
	checked: boolean
	onChange: (checked: boolean) => void
	label?: string
	id?: string
}

export function Toggle({ checked, onChange, label, id }: Props) {
	const inputId = id ?? `toggle-${Math.random().toString(36).slice(2)}`
	return (
		<label className="toggle-row" htmlFor={inputId}>
			<input
				id={inputId}
				type="checkbox"
				className="toggle-input"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
			/>
			<div className="toggle-track">
				<div className="toggle-thumb" />
			</div>
			{label && <span className="toggle-label">{label}</span>}
		</label>
	)
}
