import type { PluginCapability, PluginManifest } from "cortex-plugin-api"
import { usePluginStore } from "./pluginStore"

const validPluginCapabilities: PluginCapability[] = [
	"vault:read",
	"vault:write",
	"vault:delete",
	"vault:watch",
	"editor:extensions",
	"renderer:plugins",
	"ui:views",
	"ui:sidebar",
	"ui:statusbar",
	"ui:contextmenu",
	"commands",
	"hotkeys",
	"settings",
	"themes",
	"bookmarks:read",
	"bookmarks:write",
	"notifications",
]

const validPluginCapabilitySet = new Set<string>(validPluginCapabilities)

export function validatePluginManifestCapabilities(manifest: PluginManifest): void {
	for (const capability of manifest.capabilities ?? []) {
		if (!validPluginCapabilitySet.has(capability)) {
			throw new Error(`Unknown plugin capability "${capability}"`)
		}
	}
}

export function pluginHasCapability(pluginId: string, capability: PluginCapability): boolean {
	const manifest = usePluginStore.getState().plugins[pluginId]?.manifest
	return manifest?.capabilities?.includes(capability) ?? false
}
