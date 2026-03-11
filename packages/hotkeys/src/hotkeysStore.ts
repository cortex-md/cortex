import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { DEFAULT_HOTKEYS } from "./defaults"
import { matchesEvent, parseHotkey } from "./parser"
import type { HotkeyBinding, HotkeyOverrides } from "./types"

type HotkeyHandler = () => void

interface HotkeysState {
	bindings: HotkeyBinding[]
	handlers: Record<string, HotkeyHandler>

	loadOverrides: (vaultPath: string) => Promise<void>
	saveOverrides: (vaultPath: string) => Promise<void>
	updateBinding: (id: string, keys: string) => void
	resetBinding: (id: string) => void
	resetAll: () => void
	registerHandler: (id: string, handler: HotkeyHandler) => void
	unregisterHandler: (id: string) => void
	handleKeyEvent: (event: KeyboardEvent) => boolean
}

export const useHotkeysStore = create<HotkeysState>((set, get) => ({
	bindings: DEFAULT_HOTKEYS.map((h) => ({ ...h })),
	handlers: {},

	loadOverrides: async (vaultPath) => {
		try {
			const platform = getPlatform()
			const configDir = await platform.storage.getVaultConfigDir(vaultPath)
			const raw = await platform.fs.readFile(`${configDir}/hotkeys.json`)
			const overrides: HotkeyOverrides = JSON.parse(raw)

			set({
				bindings: DEFAULT_HOTKEYS.map((defaultBinding) => {
					const override = overrides[defaultBinding.id]
					if (!override) return { ...defaultBinding }
					return {
						...defaultBinding,
						keys: override.keys ?? defaultBinding.defaultKeys,
						enabled: override.enabled ?? defaultBinding.enabled,
					}
				}),
			})
		} catch (_e) {
			set({ bindings: DEFAULT_HOTKEYS.map((h) => ({ ...h })) })
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
		set({ bindings: DEFAULT_HOTKEYS.map((h) => ({ ...h })) })
	},

	registerHandler: (id, handler) => {
		set({ handlers: { ...get().handlers, [id]: handler } })
	},

	unregisterHandler: (id) => {
		const { [id]: _, ...rest } = get().handlers
		set({ handlers: rest })
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
