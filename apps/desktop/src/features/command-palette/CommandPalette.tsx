import { useUIStore } from "@cortex/core"
import { formatHotkeyDisplay, useHotkeysStore } from "@cortex/hotkeys"
import { type CommandEntry, getCommands } from "@cortex/plugin-runtime"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandShortcut,
} from "@cortex/ui"
import { useCallback, useMemo } from "react"

interface GroupedCommands {
	category: string
	commands: CommandEntry[]
}

function groupByCategory(commands: CommandEntry[]): GroupedCommands[] {
	const groups = new Map<string, CommandEntry[]>()
	for (const cmd of commands) {
		const existing = groups.get(cmd.category) ?? []
		existing.push(cmd)
		groups.set(cmd.category, existing)
	}
	return Array.from(groups.entries()).map(([category, commands]) => ({ category, commands }))
}

export function CommandPalette() {
	const { commandPaletteOpen, toggleCommandPalette } = useUIStore()
	const bindings = useHotkeysStore((s) => s.bindings)

	const shortcutMap = useMemo(() => {
		const map = new Map<string, string>()
		for (const binding of bindings) {
			map.set(binding.id, formatHotkeyDisplay(binding.keys))
		}
		return map
	}, [bindings])

	// biome-ignore lint/correctness/useExhaustiveDependencies: recompute commands when palette opens
	const grouped = useMemo(() => {
		return groupByCategory(getCommands())
	}, [commandPaletteOpen])

	const handleSelect = useCallback(
		(commandId: string) => {
			const commands = getCommands()
			const command = commands.find((c) => c.id === commandId)
			if (command) {
				toggleCommandPalette()
				requestAnimationFrame(() => command.execute())
			}
		},
		[toggleCommandPalette],
	)

	return (
		<CommandDialog
			open={commandPaletteOpen}
			onOpenChange={(open) => {
				if (!open) toggleCommandPalette()
			}}
			title="Command Palette"
			description="Search for a command to run..."
			showCloseButton={false}
		>
			<CommandInput placeholder="Type a command..." />
			<CommandList>
				<CommandEmpty>No commands found</CommandEmpty>
				{grouped.map((group) => (
					<CommandGroup key={group.category} heading={group.category}>
						{group.commands.map((cmd) => {
							const Icon = typeof cmd.icon === "function" ? cmd.icon : null
							const shortcut = cmd.shortcut ?? shortcutMap.get(cmd.id)
							return (
								<CommandItem
									key={cmd.id}
									value={`${cmd.label} ${cmd.category}`}
									onSelect={() => handleSelect(cmd.id)}
								>
									{Icon && <Icon className="size-4 text-muted-foreground" />}
									<span className="flex-1">{cmd.label}</span>
									{shortcut && <CommandShortcut>{shortcut}</CommandShortcut>}
								</CommandItem>
							)
						})}
					</CommandGroup>
				))}
			</CommandList>
		</CommandDialog>
	)
}
