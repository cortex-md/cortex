import { Switch as SwitchPrimitive } from "radix-ui"
import type * as React from "react"

import { nativeFocusRing } from "./lib/native-styles"
import { cn } from "./lib/utils"

function Switch({
	className,
	size = "default",
	...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
	size?: "sm" | "default" | "lg"
}) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			data-size={size}
			className={cn(
				"peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent p-px outline-none transition-[background-color,opacity,filter] duration-150 ease-out active:brightness-[0.98] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[18px] data-[size=default]:w-8 data-[size=lg]:h-6 data-[size=lg]:w-[54px] data-[size=sm]:h-4 data-[size=sm]:w-7 data-[state=checked]:bg-brand data-[state=checked]:active:bg-brand-hover data-[state=unchecked]:bg-[#78788029] dark:data-[state=unchecked]:bg-[#78788052]",
				nativeFocusRing,
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					"pointer-events-none block rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.28)] ring-0 transition-[transform,box-shadow] duration-150 ease-out group-active/switch:scale-90 group-active/switch:shadow-[0_1px_2px_rgba(0,0,0,0.24)] group-data-[size=default]/switch:size-4 group-data-[size=lg]/switch:size-[22px] group-data-[size=sm]/switch:size-3.5 data-[state=checked]:translate-x-3.5 group-data-[size=lg]/switch:data-[state=checked]:translate-x-[30px] group-data-[size=sm]/switch:data-[state=checked]:translate-x-3 data-[state=unchecked]:translate-x-0",
				)}
			/>
		</SwitchPrimitive.Root>
	)
}

export { Switch }
