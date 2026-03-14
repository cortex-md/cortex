import type { Disposable, PluginAPI, PluginHotkeyBinding } from "@cortex/plugin-api"

type RegisterHandlerFn = (id: string, handler: () => void) => void
type UnregisterHandlerFn = (id: string) => void

let registerHandlerFn: RegisterHandlerFn | null = null
let unregisterHandlerFn: UnregisterHandlerFn | null = null

export function setHotkeyHandlerFunctions(
	register: RegisterHandlerFn,
	unregister: UnregisterHandlerFn,
): void {
	registerHandlerFn = register
	unregisterHandlerFn = unregister
}

export function createHotkeysAPI(pluginId: string): PluginAPI["hotkeys"] {
	return {
		register(binding: PluginHotkeyBinding): Disposable {
			const hotkeyId = `${pluginId}:${binding.id}`
			if (registerHandlerFn) {
				registerHandlerFn(hotkeyId, () => binding.execute())
			}
			return {
				dispose() {
					if (unregisterHandlerFn) {
						unregisterHandlerFn(hotkeyId)
					}
				},
			}
		},
	}
}
