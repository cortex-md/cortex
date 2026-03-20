import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { DEFAULT_HOTKEYS } from "./defaults"
import { matchesEvent, parseHotkey } from "./parser"
import type { HotkeyBinding, HotkeyOverrides } from "./types"

type HotkeyHandler = () => void

interface HotkeysState {
	bindings: HotkeyBinding[]
	handlers: Record<string, HotkeyHandler>
	dynamicBindingIds: Set<string>

	loadOverrides: (vaultPath: string) => Promise<void>
	saveOverrides: (vaultPath: string) => Promise<void>
	updateBinding: (id: string, keys: string) => void
	resetBinding: (id: string) => void
	resetAll: () => void
	registerHandler: (id: string, handler: HotkeyHandler) => void
	unregisterHandler: (id: string) => void
	handleKeyEvent: (event: KeyboardEvent) => boolean
	addDynamicBinding: (binding: HotkeyBinding) => void
	removeDynamicBinding: (id: string) => void
}

export const useHotkeysStore = create<HotkeysState>((set, get) => ({
	bindings: DEFAULT_HOTKEYS.map((h) => ({ ...h })),
	handlers: {},
	dynamicBindingIds: new Set<string>(),

	loadOverrides: async (vaultPath) => {
		try {
			const platform = getPlatform()
			const configDir = await platform.storage.getVaultConfigDir(vaultPath)
			const raw = await platform.fs.readFile(`${configDir}/hotkeys.json`)
			const overrides: HotkeyOverrides = JSON.parse(raw)

			const { dynamicBindingIds, bindings: currentBindings } = get()
			const dynamicBindings = currentBindings.filter((b) => dynamicBindingIds.has(b.id))

			const defaultBindingsWithOverrides = DEFAULT_HOTKEYS.map((defaultBinding) => {
				const override = overrides[defaultBinding.id]
				if (!override) return { ...defaultBinding }
				return {
					...defaultBinding,
					keys: override.keys ?? defaultBinding.defaultKeys,
					enabled: override.enabled ?? defaultBinding.enabled,
				}
			})

			const dynamicBindingsWithOverrides = dynamicBindings.map((binding) => {
				const override = overrides[binding.id]
				if (!override) return binding
				return {
					...binding,
					keys: override.keys ?? binding.defaultKeys,
					enabled: override.enabled ?? binding.enabled,
				}
			})

			set({
				bindings: [...defaultBindingsWithOverrides, ...dynamicBindingsWithOverrides],
			})
		} catch (_e) {
			const { dynamicBindingIds, bindings: currentBindings } = get()
			const dynamicBindings = currentBindings.filter((b) => dynamicBindingIds.has(b.id))
			set({ bindings: [...DEFAULT_HOTKEYS.map((h) => ({ ...h })), ...dynamicBindings] })
		}
	},

	saveOverrides: async (vaultPath) => {
		const { bindings } = get()
		const overrides: HotkeyOverrides = {}

		for (const binding of bindings) {
			if (binding.keys !== binding.defaultKeys || !binding.enabled) {
				overrides[binding.id] = {
					keys: binding.keys,
					enabled: binding.enabled,
				}
			}
		}

		try {
			const platform = getPlatform()
			const configDir = await platform.storage.getVaultConfigDir(vaultPath)
			await platform.fs.writeFile(
				`${configDir}/hotkeys.json`,
				JSON.stringify(overrides, null, "\t"),
			)
		} catch (_e) {}
	},

	updateBinding: (id, keys) => {
		set({
			bindings: get().bindings.map((b) => (b.id === id ? { ...b, keys } : b)),
		})
	},

	resetBinding: (id) => {
		set({
			bindings: get().bindings.map((b) =>
				b.id === id ? { ...b, keys: b.defaultKeys, enabled: true } : b,
			),
		})
	},

	resetAll: () => {
		const { dynamicBindingIds, bindings: currentBindings } = get()
		const dynamicBindings = currentBindings.filter((b) => dynamicBindingIds.has(b.id))
		set({ bindings: [...DEFAULT_HOTKEYS.map((h) => ({ ...h })), ...dynamicBindings] })
	},

	registerHandler: (id, handler) => {
		set({ handlers: { ...get().handlers, [id]: handler } })
	},

	unregisterHandler: (id) => {
		const { [id]: _, ...rest } = get().handlers
		set({ handlers: rest })
	},

	addDynamicBinding: (binding) => {
		const { bindings, dynamicBindingIds } = get()
		if (bindings.some((b) => b.id === binding.id)) return
		const newDynamicIds = new Set(dynamicBindingIds)
		newDynamicIds.add(binding.id)
		set({
			bindings: [...bindings, binding],
			dynamicBindingIds: newDynamicIds,
		})
	},

	removeDynamicBinding: (id) => {
		const { bindings, dynamicBindingIds } = get()
		const newDynamicIds = new Set(dynamicBindingIds)
		newDynamicIds.delete(id)
		set({
			bindings: bindings.filter((b) => b.id !== id),
			dynamicBindingIds: newDynamicIds,
		})
	},

	handleKeyEvent: (event) => {
		const { bindings, handlers } = get()

		for (const binding of bindings) {
			if (!binding.enabled) continue
			const handler = handlers[binding.id]
			if (!handler) continue

			const parsed = parseHotkey(binding.keys)
			if (matchesEvent(parsed, event)) {
				event.preventDefault()
				handler()
				return true
			}
		}

		return false
	},
}))
