import { registerPropertyType } from "@cortex/properties"
import type { Disposable, PluginAPI } from "cortex-plugin-api"
import { pluginHasCapability } from "../manifestCapabilities"

const pluginTypeDisposers = new Map<string, Set<() => void>>()

function requirePropertiesCapability(pluginId: string): void {
	if (!pluginHasCapability(pluginId, "properties:types")) {
		throw new Error(`Plugin "${pluginId}" requires the properties:types capability`)
	}
}

export function createPropertiesAPI(pluginId: string): PluginAPI["properties"] {
	return {
		registerType(registration): Disposable {
			requirePropertiesCapability(pluginId)
			const type = `${pluginId}:${registration.type.trim()}`
			const disposeRegistration = registerPropertyType({
				...registration,
				type,
			})
			let disposers = pluginTypeDisposers.get(pluginId)
			if (!disposers) {
				disposers = new Set()
				pluginTypeDisposers.set(pluginId, disposers)
			}
			disposers.add(disposeRegistration)
			return {
				dispose() {
					disposeRegistration()
					disposers?.delete(disposeRegistration)
					if (disposers?.size === 0) pluginTypeDisposers.delete(pluginId)
				},
			}
		},
	}
}

export function disposePluginPropertyTypes(pluginId: string): void {
	const disposers = pluginTypeDisposers.get(pluginId)
	if (!disposers) return
	for (const dispose of disposers) dispose()
	pluginTypeDisposers.delete(pluginId)
}
