"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Toggle as TogglePrimitive } from "radix-ui"
import type * as React from "react"

import { nativeFocusRing } from "./lib/native-styles"
import { cn } from "./lib/utils"

const toggleVariants = cva(
	[
		"inline-flex items-center justify-center gap-2 rounded-[6px] text-[13px] font-medium leading-4 whitespace-nowrap outline-none transition-[background-color,border-color,color,opacity]",
		nativeFocusRing,
		"hover:bg-muted/70 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-accent/80 data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	],
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline:
					"border border-border/70 bg-background/70 hover:bg-accent/70 hover:text-accent-foreground",
			},
			size: {
				default: "h-7 min-w-7 px-2",
				sm: "h-6 min-w-6 px-1.5",
				lg: "h-10 min-w-10 px-2.5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

function Toggle({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive.Root
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Toggle, toggleVariants }
