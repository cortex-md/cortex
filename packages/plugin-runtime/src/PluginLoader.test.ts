import type { FileEntry } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { discoverCommunityPlugins, getCommunityPluginLoadError, usePluginStore } from "./index"

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

beforeEach(() => {
	testState.files.clear()
	testState.dirs.clear()
	testState.platform.fs.listDir.mockClear()
	testState.platform.fs.readFile.mockClear()
	usePluginStore.getState().reset()
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
})
