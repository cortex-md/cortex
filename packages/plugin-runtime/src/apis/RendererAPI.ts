import type { Disposable, PluginAPI, RendererPlugin } from "@cortex/plugin-api"

const registeredRendererPlugins = new Map<string, RendererPlugin>()
let nextPluginId = 0

export function getRegisteredRendererPlugins(): RendererPlugin[] {
	return Array.from(registeredRendererPlugins.values())
}

export function createRendererAPI(): PluginAPI["renderer"] {
	return {
		registerPlugin(plugin: RendererPlugin): Disposable {
			const id = `renderer-${nextPluginId++}`
			registeredRendererPlugins.set(id, plugin)
			return {
				dispose() {
					registeredRendererPlugins.delete(id)
				},
			}
		},

		registerCodeBlockProcessor(_language, _handler): Disposable {
			return { dispose() {} }
		},
	}
}
