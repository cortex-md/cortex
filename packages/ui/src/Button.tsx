import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost" | "accent" | "danger"
type Size = "sm" | "md" | "lg"

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: Variant
	size?: Size
	children: ReactNode
}

export function Button({
	variant = "secondary",
	size = "md",
	className = "",
	type = "button",
	children,
	...rest
}: Props) {
	return (
		<button type={type} className={`btn btn-${size} btn-${variant} ${className}`} {...rest}>
			{children}
		</button>
	)
}
