import type { Dialog as IDialog } from "@cortex/platform"
import { confirm, message, open } from "@tauri-apps/plugin-dialog"
import { openPath } from "@tauri-apps/plugin-opener"

export class Dialog implements IDialog {
	async pickFolder(_title?: string): Promise<string | null> {
		const selected = await open({ directory: true, multiple: false })
		if (Array.isArray(selected)) return selected[0] ?? null
		return selected
	}

	async showConfirm(title: string, message_: string): Promise<boolean> {
		return await confirm(message_, { title })
	}

	async showAlert(title: string, message_: string): Promise<void> {
		await message(message_, { title })
	}

	async revealFolder(path: string): Promise<void> {
		await openPath(path)
	}
}
