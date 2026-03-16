"use client"

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@cortex/ui"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme()
	const [mounted, setMounted] = useState(false)

	useEffect(() => {
		setMounted(true)
	}, [])

	if (!mounted) {
		return <div className="h-8 w-8" />
	}

	const isDark = resolvedTheme === "dark"

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant={"ghost"}
					onClick={() => setTheme(isDark ? "light" : "dark")}
					className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-primary"
					aria-label="Alternar tema"
				>
					{isDark ? <Sun size={15} /> : <Moon size={15} />}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="text-xs">
				{isDark ? "Tema claro" : "Tema escuro"}
			</TooltipContent>
		</Tooltip>
	)
}
