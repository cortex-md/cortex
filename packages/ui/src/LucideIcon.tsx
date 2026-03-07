import * as LucideIcons from "lucide-react"
import type { ForwardRefExoticComponent, RefAttributes, SVGAttributes } from "react"

type LucideExports = typeof LucideIcons

type IconKeys = {
	[K in keyof LucideExports]: LucideExports[K] extends ForwardRefExoticComponent<infer _>
		? K
		: never
}[keyof LucideExports]

export type LucideIconName = IconKeys & string

const iconMap: Record<
	string,
	ForwardRefExoticComponent<LucideIcons.LucideProps & RefAttributes<SVGSVGElement>>
> = { ...LucideIcons } as never

interface Props extends SVGAttributes<SVGSVGElement> {
	name: LucideIconName
	size?: number | string
}

export function LucideIcon({ name, size = 16, ...rest }: Props) {
	const IconComponent = iconMap[name]
	if (!IconComponent) return null
	return <IconComponent size={size} {...rest} />
}

export function isValidLucideIconName(value: string): value is LucideIconName {
	return value in iconMap
}
