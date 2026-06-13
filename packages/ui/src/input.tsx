import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { nativeFocusRing, nativeTextFieldSurface } from "./lib/native-styles"
import { cn } from "./lib/utils"

const inputVariants = cva(
	"w-full min-w-0 rounded-[6px] text-[13px] leading-4 outline-none transition-[background-color,border-color,color,box-shadow] selection:bg-brand selection:text-text-on-accent file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
	{
		variants: {
			size: {
				sm: "h-6 px-2",
				default: "h-8 px-3",
			},
		},
		defaultVariants: {
			size: "default",
		},
	},
)

function Input({
	className,
	type,
	size = "default",
	...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
	return (
		<input
			type={type}
			data-slot="input"
			data-size={size}
			className={cn(inputVariants({ size }), nativeTextFieldSurface, nativeFocusRing, className)}
			{...props}
		/>
	)
}

export { Input, inputVariants }
