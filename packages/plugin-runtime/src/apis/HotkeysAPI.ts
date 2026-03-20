import type { Disposable, PluginAPI, PluginHotkeyBinding } from "cortex-plugin-api"

type RegisterHandlerFn = (id: string, handler: () => void) => void
type UnregisterHandlerFn = (id: string) => void

interface DynamicBinding {
	id: string
	label: string
	category: string
	defaultKeys: string
	keys: string
	enabled: boolean
}

type AddDynamicBindingFn = (binding: DynamicBinding) => void
type RemoveDynamicBindingFn = (id: string) => void

let registerHandlerFn: RegisterHandlerFn | null = null
let unregisterHandlerFn: UnregisterHandlerFn | null = null
let addDynamicBindingFn: AddDynamicBindingFn | null = null
let removeDynamicBindingFn: RemoveDynamicBindingFn | null = null

export function setHotkeyHandlerFunctions(
	register: RegisterHandlerFn,
	unregister: UnregisterHandlerFn,
): void {
	registerHandlerFn = register
	unregisterHandlerFn = unregister
}

export function setDynamicBindingFunctions(
	add: AddDynamicBindingFn,
	remove: RemoveDynamicBindingFn,
): void {
	addDynamicBindingFn = add
	removeDynamicBindingFn = remove
}

export function registerCommandHotkey(
	commandId: string,
	label: string,
	category: string,
	defaultHotkey: string,
	handler: () => void,
): Disposable {
	if (addDynamicBindingFn) {
		addDynamicBindingFn({
			id: commandId,
			label,
			category,
			defaultKeys: defaultHotkey,
			keys: defaultHotkey,
			enabled: true,
		})
	}
	if (registerHandlerFn) {
		registerHandlerFn(commandId, handler)
	}
	return {
		dispose() {
			if (removeDynamicBindingFn) {
				removeDynamicBindingFn(commandId)
			}
			if (unregisterHandlerFn) {
				unregisterHandlerFn(commandId)
			}
		},
	}
}

export function createHotkeysAPI(pluginId: string): PluginAPI["hotkeys"] {
	return {
		register(binding: PluginHotkeyBinding): Disposable {
			const hotkeyId = `${pluginId}:${binding.id}`
			if (addDynamicBindingFn) {
				addDynamicBindingFn({
					id: hotkeyId,
					label: binding.label,
					category: pluginId,
					defaultKeys: binding.defaultBinding,
					keys: binding.defaultBinding,
					enabled: true,
				})
			}
			if (registerHandlerFn) {
				registerHandlerFn(hotkeyId, () => binding.execute())
			}
			return {
				dispose() {
					if (removeDynamicBindingFn) {
						removeDynamicBindingFn(hotkeyId)
					}
					if (unregisterHandlerFn) {
						unregisterHandlerFn(hotkeyId)
					}
				},
			}
		},
	}
}
