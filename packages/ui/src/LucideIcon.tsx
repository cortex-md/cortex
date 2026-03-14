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

const lowercaseIndex = new Map<string, string>()
for (const key of Object.keys(iconMap)) {
	lowercaseIndex.set(key.toLowerCase(), key)
}

function resolveIconName(name: string): string | undefined {
	if (name in iconMap) return name
	return lowercaseIndex.get(name.toLowerCase())
}

interface Props extends SVGAttributes<SVGSVGElement> {
	name: LucideIconName | string
	size?: number | string
}

export function LucideIcon({ name, size = 16, ...rest }: Props) {
	const resolved = resolveIconName(name)
	if (!resolved) return null
	const IconComponent = iconMap[resolved]
	if (!IconComponent) return null
	return <IconComponent size={size} {...rest} />
}

export function isValidLucideIconName(value: string): value is LucideIconName {
	return resolveIconName(value) !== undefined
}
