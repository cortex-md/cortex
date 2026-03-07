import type { InputHTMLAttributes, ReactNode } from "react"

interface Props extends InputHTMLAttributes<HTMLInputElement> {
	error?: boolean
	icon?: ReactNode
}

export function Input({ error, icon, className = "", ...rest }: Props) {
	if (icon) {
		return (
			<div className="input-wrapper">
				<span className="input-icon">{icon}</span>
				<input className={`input-field ${error ? "input-error" : ""} ${className}`} {...rest} />
			</div>
		)
	}
	return <input className={`input-field ${error ? "input-error" : ""} ${className}`} {...rest} />
}
