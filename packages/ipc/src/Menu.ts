import type { Menu as IMenu, NativeContextMenuOptions } from "@cortex/platform"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

interface NativeContextMenuSelection {
	requestId: string
	itemId: string
}

interface NativeContextMenuCommandOptions extends NativeContextMenuOptions {
	requestId: string
}

const CONTEXT_MENU_TIMEOUT_MS = 8_000

function createRequestId(): string {
	return crypto.randomUUID()
}

export class Menu implements IMenu {
	async showContextMenu(options: NativeContextMenuOptions): Promise<string | null> {
		const requestId = createRequestId()
		let timeout: ReturnType<typeof setTimeout> | null = null
		let resolveSelection: (itemId: string | null) => void = () => {}
		const selected = new Promise<string | null>((resolve) => {
			resolveSelection = resolve
		})

		const unlisten = await listen<NativeContextMenuSelection>(
			"native-context-menu-selected",
			(event) => {
				if (event.payload.requestId !== requestId) return
				resolveSelection(event.payload.itemId)
			},
		)

		try {
			timeout = setTimeout(() => resolveSelection(null), CONTEXT_MENU_TIMEOUT_MS)
			await invoke<void>("show_context_menu", {
				options: { ...options, requestId } satisfies NativeContextMenuCommandOptions,
			})
			return await selected
		} finally {
			if (timeout) clearTimeout(timeout)
			unlisten()
		}
	}
}
