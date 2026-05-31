import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import type * as React from "react"
import { nativeAccentText, nativeFocusRing } from "./lib/native-styles"
import { cn } from "./lib/utils"

const buttonVariants = cva(
	[
		"inline-flex shrink-0 items-center justify-center gap-2 rounded-[6px] text-[13px] font-medium leading-4 whitespace-nowrap outline-none transition-[background-color,border-color,color,opacity,filter]",
		nativeFocusRing,
		"disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
		"active:brightness-95 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	],
	{
		variants: {
			variant: {
				default:
					"border border-border/70 bg-background/80 text-foreground hover:bg-accent/70 active:bg-accent",
				destructive:
					"border border-destructive/20 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
				outline:
					"border border-border/70 bg-background/70 hover:bg-accent/70 hover:text-accent-foreground dark:border-input dark:bg-input/20 dark:hover:bg-input/40",
				secondary:
					"border border-transparent bg-secondary/80 text-secondary-foreground hover:bg-secondary",
				ghost: "hover:bg-accent/70 hover:text-accent-foreground dark:hover:bg-accent/50",
				link: [nativeAccentText, "underline-offset-4 hover:underline"],
			},
			size: {
				default: "h-7 px-3 py-1.5 has-[>svg]:px-2.5",
				xs: "h-6 gap-1 px-2 text-[13px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
				sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
				lg: "h-10 px-6 has-[>svg]:px-4",
				icon: "size-7",
				"icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
)

function Button({
	className,
	variant = "default",
	size = "default",
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot.Root : "button"

	return (
		<Comp
			data-slot="button"
			data-variant={variant}
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
