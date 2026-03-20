import { getPlatform } from "@cortex/platform"
import type { PluginManifest } from "cortex-plugin-api"
import { CortexPlugin } from "cortex-plugin-api"
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

		await api.settings.load()
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

const communityPluginExternals: Record<string, unknown> = {
	"cortex-plugin-api": { CortexPlugin },
}

export function setCommunityPluginExternal(moduleId: string, moduleExports: unknown): void {
	communityPluginExternals[moduleId] = moduleExports
}

export async function discoverCommunityPlugins(pluginsDir: string): Promise<void> {
	const fs = getPlatform().fs
	let entries: Awaited<ReturnType<typeof fs.listDir>>
	try {
		entries = await fs.listDir(pluginsDir)
	} catch {
		return
	}

	const pluginDirs = entries.filter((e) => e.isDir)
	for (const dir of pluginDirs) {
		try {
			const manifestPath = `${dir.path}/manifest.json`
			const manifestContent = await fs.readFile(manifestPath)
			const manifest = JSON.parse(manifestContent) as PluginManifest

			if (!manifest.id || !manifest.main) continue

			const mainPath = `${dir.path}/${manifest.main}`
			const moduleCode = await fs.readFile(mainPath)

			const loadedModule = loadCommunityModule(moduleCode, manifest.id)
			if (loadedModule) {
				bundledPlugins.set(manifest.id, loadedModule)
				usePluginStore.getState().registerPlugin(manifest)
			}
		} catch {}
	}
}

function loadCommunityModule(code: string, pluginId: string): PluginModule | null {
	try {
		const moduleExports: Record<string, unknown> = {}
		const moduleObj = { exports: moduleExports as Record<string, unknown> & { default?: unknown } }

		const requireStub = (id: string): unknown => {
			const resolved = communityPluginExternals[id]
			if (resolved) return resolved
			throw new Error(`Cannot require "${id}" in plugin "${pluginId}"`)
		}

		// biome-ignore lint/security/noGlobalEval: required to load community plugin CJS bundles
		const indirectEval = globalThis.eval
		const factory = indirectEval(`(function(module, exports, require) {\n${code}\n})`) as (
			m: typeof moduleObj,
			e: typeof moduleExports,
			r: typeof requireStub,
		) => void
		factory(moduleObj, moduleExports, requireStub)

		const defaultExport =
			(moduleObj.exports.default as PluginConstructor) ??
			(moduleObj.exports as unknown as PluginConstructor)

		if (typeof defaultExport === "function") {
			return { default: defaultExport }
		}
		return null
	} catch {
		return null
	}
}

export async function loadEnabledPlugins(
	vaultPath: string,
	getVaultPath: () => string | null,
): Promise<void> {
	const { ids, isDefault } = await readEnabledPlugins(vaultPath)
	for (const pluginId of ids) {
		if (!bundledPlugins.has(pluginId)) continue
		try {
			await enablePlugin(pluginId, getVaultPath)
		} catch {}
	}
	if (isDefault) {
		await saveEnabledPlugins(vaultPath)
	}
}

async function readEnabledPlugins(
	vaultPath: string,
): Promise<{ ids: string[]; isDefault: boolean }> {
	try {
		const content = await getPlatform().fs.readFile(`${vaultPath}/.cortex/plugins.json`)
		const data = JSON.parse(content) as { enabled?: string[] }
		return { ids: data.enabled ?? [], isDefault: false }
	} catch {
		return { ids: Array.from(bundledPlugins.keys()), isDefault: true }
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

let communityPluginsDir = "~/.cortex/plugins"

export function setCommunityPluginsDir(dir: string): void {
	communityPluginsDir = dir
}

export function getCommunityPluginsDir(): string {
	return communityPluginsDir
}
