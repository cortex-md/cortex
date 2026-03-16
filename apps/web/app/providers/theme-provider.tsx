"use client"

import { TooltipProvider } from "@cortex/ui"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ComponentProps } from "react"

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			enableSystem
			disableTransitionOnChange
			value={{
				light: "theme-paper",
				dark: "theme-ink",
			}}
			{...props}
		>
			<TooltipProvider>{children}</TooltipProvider>
		</NextThemesProvider>
	)
}
