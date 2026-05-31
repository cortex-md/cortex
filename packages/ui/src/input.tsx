import type * as React from "react"

import { nativeControlSurface, nativeFocusRing, nativeTextControl } from "./lib/native-styles"
import { cn } from "./lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"w-full min-w-0 outline-none transition-[background-color,border-color,color,box-shadow] selection:bg-brand selection:text-text-on-accent file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				nativeTextControl,
				nativeControlSurface,
				nativeFocusRing,
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				className,
			)}
			{...props}
		/>
	)
}

export { Input }
