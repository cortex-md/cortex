import type { FileEntry } from "@cortex/platform"
import { CortexPlugin } from "cortex-plugin-api"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	disableAllPlugins,
	discoverCommunityPlugins,
	enablePlugin,
	getCommunityPluginLoadError,
	registerBundledPlugin,
	reloadCommunityPlugins,
	usePluginStore,
} from "./index"

const testState = vi.hoisted(() => ({
	files: new Map<string, string>(),
	dirs: new Map<string, FileEntry[]>(),
	platform: {
		fs: {
			listDir: vi.fn(async (path: string) => {
				const entries = testState.dirs.get(path)
				if (!entries) throw new Error(`Missing dir: ${path}`)
				return entries
			}),
			readFile: vi.fn(async (path: string) => {
				const content = testState.files.get(path)
				if (content === undefined) throw new Error(`Missing file: ${path}`)
				return content
			}),
		},
	},
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: () => testState.platform,
}))

const pluginsDir = "/vault/.cortex/plugins"

class BadBundledPlugin extends CortexPlugin {
	onload() {}
}

function registerPluginFiles(pluginId: string, main: string) {
	const pluginDir = `${pluginsDir}/${pluginId}`
	testState.dirs.set(pluginsDir, [
		{
			path: pluginDir,
			name: pluginId,
			isDir: true,
		},
	])
	testState.files.set(
		`${pluginDir}/manifest.json`,
		JSON.stringify({
			id: pluginId,
			name: pluginId,
			version: "0.1.0",
			minAppVersion: "0.1.0",
			author: "Tester",
			description: "Test plugin",
			icon: "puzzle",
			main: "main.js",
		}),
	)
	testState.files.set(`${pluginDir}/main.js`, main)
}

beforeEach(async () => {
	await disableAllPlugins()
	testState.files.clear()
	testState.dirs.clear()
	testState.platform.fs.listDir.mockClear()
	testState.platform.fs.readFile.mockClear()
	usePluginStore.getState().reset()
	delete (globalThis as typeof globalThis & { reloadEvents?: string[] }).reloadEvents
})

describe("discoverCommunityPlugins", () => {
	it("loads CommonJS community bundles", async () => {
		registerPluginFiles("common-js-plugin", "module.exports = class CommonJSPlugin {}")

		await discoverCommunityPlugins(pluginsDir)

		expect(usePluginStore.getState().plugins["common-js-plugin"]).toBeDefined()
		expect(getCommunityPluginLoadError("common-js-plugin")).toBeNull()
	})

	it("loads self-contained ESM community bundles", async () => {
		registerPluginFiles(
			"esm-plugin",
			["class ESMPlugin {}", "export { ESMPlugin as default };"].join("\n"),
		)

		await discoverCommunityPlugins(pluginsDir)

		expect(usePluginStore.getState().plugins["esm-plugin"]).toBeDefined()
		expect(getCommunityPluginLoadError("esm-plugin")).toBeNull()
	})

	it("stores the loader error when a bundle cannot export a plugin class", async () => {
		registerPluginFiles("bad-plugin", "export const value = 1;")

		await discoverCommunityPlugins(pluginsDir)

		expect(usePluginStore.getState().plugins["bad-plugin"]).toBeUndefined()
		expect(getCommunityPluginLoadError("bad-plugin")).toContain(
			"Plugin bundle must export a default plugin class",
		)
	})

	it("stores the loader error when a manifest declares an unknown capability", async () => {
		registerPluginFiles("unknown-capability-plugin", "module.exports = class TestPlugin {}")
		testState.files.set(
			`${pluginsDir}/unknown-capability-plugin/manifest.json`,
			JSON.stringify({
				id: "unknown-capability-plugin",
				name: "Unknown Capability Plugin",
				version: "0.1.0",
				minAppVersion: "0.1.0",
				author: "Tester",
				description: "Test plugin",
				icon: "puzzle",
				main: "main.js",
				capabilities: ["notifications", "native:everything"],
			}),
		)

		await discoverCommunityPlugins(pluginsDir)

		expect(usePluginStore.getState().plugins["unknown-capability-plugin"]).toBeUndefined()
		expect(getCommunityPluginLoadError("unknown-capability-plugin")).toContain(
			'Unknown plugin capability "native:everything"',
		)
	})

	it("rejects bundled plugins with unknown capabilities", () => {
		expect(() =>
			registerBundledPlugin(
				{
					id: "bad-bundled-plugin",
					name: "Bad Bundled Plugin",
					version: "0.1.0",
					minAppVersion: "0.1.0",
					author: "Tester",
					description: "Test plugin",
					icon: "puzzle",
					main: "main.js",
					capabilities: ["native:everything" as never],
				},
				{ default: BadBundledPlugin },
			),
		).toThrow('Unknown plugin capability "native:everything"')
	})

	it("reloads enabled community plugins from the latest bundle", async () => {
		registerPluginFiles(
			"reload-plugin",
			[
				`const { CortexPlugin } = require("cortex-plugin-api")`,
				`module.exports = class ReloadPlugin extends CortexPlugin {`,
				`	onload() { globalThis.reloadEvents = [...(globalThis.reloadEvents ?? []), "load-v1"] }`,
				`	onunload() { globalThis.reloadEvents = [...(globalThis.reloadEvents ?? []), "unload-v1"] }`,
				`}`,
			].join("\n"),
		)

		await discoverCommunityPlugins(pluginsDir)
		await enablePlugin("reload-plugin", () => null)

		testState.files.set(
			`${pluginsDir}/reload-plugin/main.js`,
			[
				`const { CortexPlugin } = require("cortex-plugin-api")`,
				`module.exports = class ReloadPlugin extends CortexPlugin {`,
				`	onload() { globalThis.reloadEvents = [...(globalThis.reloadEvents ?? []), "load-v2"] }`,
				`}`,
			].join("\n"),
		)

		await reloadCommunityPlugins(pluginsDir, () => null)

		expect((globalThis as typeof globalThis & { reloadEvents?: string[] }).reloadEvents).toEqual([
			"load-v1",
			"unload-v1",
			"load-v2",
		])
		expect(usePluginStore.getState().plugins["reload-plugin"].status).toBe("enabled")
	})
})
