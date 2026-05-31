import { ChevronDownIcon } from "lucide-react"
import type * as React from "react"

import { nativeFocusRing, nativeGlassSurface } from "./lib/native-styles"
import { cn } from "./lib/utils"

function NativeSelect({
	className,
	size = "default",
	...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
	return (
		<div
			className="group/native-select relative w-fit has-[select:disabled]:opacity-50"
			data-slot="native-select-wrapper"
		>
			<select
				data-slot="native-select"
				data-size={size}
				className={cn(
					"h-9 w-full min-w-0 appearance-none rounded-full px-3 py-2 pr-9 text-[13px] leading-4 outline-none transition-[background-color,border-color,color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-6 data-[size=sm]:rounded-[6px] data-[size=sm]:py-1",
					nativeGlassSurface,
					nativeFocusRing,
					"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
					className,
				)}
				{...props}
			/>
			<ChevronDownIcon
				className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-muted-foreground opacity-70 select-none"
				aria-hidden="true"
				data-slot="native-select-icon"
			/>
		</div>
	)
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
	return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup({ className, ...props }: React.ComponentProps<"optgroup">) {
	return <optgroup data-slot="native-select-optgroup" className={cn(className)} {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
