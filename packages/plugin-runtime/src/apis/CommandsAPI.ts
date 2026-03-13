import type { Disposable, PluginAPI, PluginCommand } from "@cortex/plugin-api"
import type { ComponentType } from "react"

export type CommandIcon = ComponentType<{ className?: string }> | string

export interface CommandEntry {
	id: string
	label: string
	category: string
	icon?: CommandIcon
	shortcut?: string
	execute: () => void
}

const commands = new Map<string, CommandEntry>()

export function registerCommand(command: CommandEntry): () => void {
	commands.set(command.id, command)
	return () => {
		commands.delete(command.id)
	}
}

export function getCommands(): CommandEntry[] {
	return Array.from(commands.values())
}

export function executeCommand(id: string): boolean {
	const command = commands.get(id)
	if (!command) return false
	command.execute()
	return true
}

export function createCommandsAPI(pluginId: string): PluginAPI["commands"] {
	return {
		register(command: PluginCommand): Disposable {
			const prefixedId = `${pluginId}:${command.id}`
			const unregister = registerCommand({
				id: prefixedId,
				label: command.label,
				category: command.category ?? pluginId,
				icon: command.icon,
				shortcut: command.shortcut,
				execute: () => command.execute(),
			})
			return { dispose: unregister }
		},
		execute(commandId: string): boolean {
			return executeCommand(`${pluginId}:${commandId}`)
		},
	}
}
