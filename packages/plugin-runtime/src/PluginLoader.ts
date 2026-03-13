import { getPlatform } from "@cortex/platform"
import type { CortexPlugin, PluginManifest } from "@cortex/plugin-api"
import { createPluginAPI } from "./PluginAPIFactory"
import { usePluginStore } from "./pluginStore"

interface PluginInstance {
	plugin: CortexPlugin
	manifest: PluginManifest
}

const instances = new Map<string, PluginInstance>()

type PluginConstructor = new () => CortexPlugin

interface PluginModule {
	default: PluginConstructor
}

const bundledPlugins = new Map<string, PluginModule>()

export function registerBundledPlugin(manifest: PluginManifest, module: PluginModule): void {
	bundledPlugins.set(manifest.id, module)
	usePluginStore.getState().registerPlugin(manifest)
}

export async function enablePlugin(
	pluginId: string,
	getVaultPath: () => string | null,
): Promise<void> {
	const store = usePluginStore.getState()
	const record = store.plugins[pluginId]
	if (!record) throw new Error(`Plugin not found: ${pluginId}`)
	if (instances.has(pluginId)) return

	const module = bundledPlugins.get(pluginId)
	if (!module) throw new Error(`Plugin module not found: ${pluginId}`)

	try {
		const PluginClass = module.default
		const plugin = new PluginClass()
		const api = createPluginAPI(pluginId, getVaultPath)

		plugin.manifest = record.manifest
		plugin.api = api

		await plugin.onload()

		instances.set(pluginId, { plugin, manifest: record.manifest })
		store.setPluginStatus(pluginId, "enabled")
	} catch (error) {
		store.setPluginStatus(pluginId, "error", String(error))
		throw error
	}
}

export async function disablePlugin(pluginId: string): Promise<void> {
	const instance = instances.get(pluginId)
	if (!instance) return

	try {
		await instance.plugin.onunload()
	} catch {}

	instance.plugin._disposeAll()
	instances.delete(pluginId)
	usePluginStore.getState().setPluginStatus(pluginId, "disabled")
}

export async function disableAllPlugins(): Promise<void> {
	const pluginIds = Array.from(instances.keys())
	for (const pluginId of pluginIds) {
		await disablePlugin(pluginId)
	}
}

export async function loadEnabledPlugins(
	vaultPath: string,
	getVaultPath: () => string | null,
): Promise<void> {
	const enabledIds = await readEnabledPlugins(vaultPath)
	for (const pluginId of enabledIds) {
		if (!bundledPlugins.has(pluginId)) continue
		try {
			await enablePlugin(pluginId, getVaultPath)
		} catch {}
	}
}

async function readEnabledPlugins(vaultPath: string): Promise<string[]> {
	try {
		const content = await getPlatform().fs.readFile(`${vaultPath}/.cortex/plugins.json`)
		const data = JSON.parse(content) as { enabled?: string[] }
		return data.enabled ?? []
	} catch {
		return []
	}
}

export async function saveEnabledPlugins(vaultPath: string): Promise<void> {
	const enabledIds = Array.from(instances.keys())
	const content = JSON.stringify({ enabled: enabledIds }, null, "\t")
	try {
		await getPlatform().fs.writeFile(`${vaultPath}/.cortex/plugins.json`, content)
	} catch {}
}

export function getPluginInstance(pluginId: string): CortexPlugin | undefined {
	return instances.get(pluginId)?.plugin
}
