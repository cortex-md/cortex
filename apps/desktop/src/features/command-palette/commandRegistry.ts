import type { LucideIcon } from "lucide-react"

export interface CommandEntry {
	id: string
	label: string
	category: string
	icon?: LucideIcon
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
