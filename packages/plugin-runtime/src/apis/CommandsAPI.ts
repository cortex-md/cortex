import type { Disposable, PluginAPI, PluginCommand } from "cortex-plugin-api"
import type { ComponentType } from "react"
import { registerCommandHotkey } from "./HotkeysAPI"

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
			const category = command.category ?? pluginId
			const unregister = registerCommand({
				id: prefixedId,
				label: command.label,
				category,
				icon: command.icon,
				shortcut: command.shortcut,
				execute: () => command.execute(),
			})

			let hotkeyDisposable: Disposable | null = null
			if (command.defaultHotkey) {
				hotkeyDisposable = registerCommandHotkey(
					prefixedId,
					command.label,
					category,
					command.defaultHotkey,
					() => command.execute(),
				)
			}

			return {
				dispose() {
					unregister()
					hotkeyDisposable?.dispose()
				},
			}
		},
		execute(commandId: string): boolean {
			return executeCommand(`${pluginId}:${commandId}`)
		},
	}
}
