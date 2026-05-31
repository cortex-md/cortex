import type { FileEntry } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { installPlugin } from "./installService"
import type { GitHubRelease, GitHubReleaseAsset, RegistryEntry } from "./types"

const testState = vi.hoisted(() => ({
	files: new Map<string, string>(),
	dirs: new Set<string>(),
	downloads: new Map<string, string>(),
	archiveFiles: new Map<string, string>(),
	release: null as GitHubRelease | null,
	pluginState: {
		plugins: {} as Record<string, unknown>,
		unregisterPlugin: vi.fn(),
	},
	platform: null as unknown,
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: () => testState.platform,
}))

vi.mock("@cortex/plugin-runtime", () => ({
	getCommunityPluginLoadError: vi.fn(() => null),
	usePluginStore: {
		getState: () => testState.pluginState,
	},
}))

vi.mock("@cortex/theme", () => ({
	getThemeManager: () => ({
		unregisterTheme: vi.fn(),
	}),
}))

vi.mock("./registryService", () => ({
	fetchLatestRelease: vi.fn(async () => testState.release),
}))

const pluginsDir = "/vault/.cortex/plugins"
const entry: RegistryEntry = {
	id: "test-plugin",
	name: "Test Plugin",
	author: "Tester",
	description: "A plugin",
	coverImageUrl: "",
	repo: "owner/test-plugin",
}

function createManifest(partial: Record<string, unknown> = {}) {
	return JSON.stringify({
		id: "test-plugin",
		name: "Test Plugin",
		version: "1.0.0",
		minAppVersion: "0.1.0",
		author: "Tester",
		description: "A plugin",
		icon: "package",
		main: "main.js",
		...partial,
	})
}

function createAsset(name: string): GitHubReleaseAsset {
	return {
		name,
		browser_download_url: `${name}-url`,
	}
}

function createRelease(assets: GitHubReleaseAsset[]): GitHubRelease {
	return {
		tag_name: "v1.0.0",
		published_at: "2026-01-01T00:00:00Z",
		assets,
		zipball_url: "zip-url",
	}
}

function normalizePath(path: string) {
	return path.replace(/\/+$/g, "") || "/"
}

function parentPath(path: string) {
	const normalized = normalizePath(path)
	const index = normalized.lastIndexOf("/")
	return index <= 0 ? "/" : normalized.slice(0, index)
}

function ensureDir(path: string) {
	const normalized = normalizePath(path)
	if (normalized === "/") {
		testState.dirs.add("/")
		return
	}
	ensureDir(parentPath(normalized))
	testState.dirs.add(normalized)
}

function createPlatform() {
	return {
		fs: {
			readFile: vi.fn(async (path: string) => {
				const content = testState.files.get(normalizePath(path))
				if (content === undefined) throw new Error(`Missing file: ${path}`)
				return content
			}),
			writeFile: vi.fn(async (path: string, content: string) => {
				const normalized = normalizePath(path)
				ensureDir(parentPath(normalized))
				testState.files.set(normalized, content)
			}),
			writeBinaryFile: vi.fn(),
			deleteFile: vi.fn(async (path: string) => {
				const normalized = normalizePath(path)
				let found = testState.files.delete(normalized) || testState.dirs.delete(normalized)
				for (const file of Array.from(testState.files.keys())) {
					if (file.startsWith(`${normalized}/`)) {
						testState.files.delete(file)
						found = true
					}
				}
				for (const dir of Array.from(testState.dirs.keys())) {
					if (dir.startsWith(`${normalized}/`)) {
						testState.dirs.delete(dir)
						found = true
					}
				}
				if (!found) throw new Error(`Missing path: ${path}`)
			}),
			renameFile: vi.fn(async (oldPath: string, newPath: string) => {
				const oldNormalized = normalizePath(oldPath)
				const newNormalized = normalizePath(newPath)
				if (testState.files.has(oldNormalized)) {
					const content = testState.files.get(oldNormalized)!
					testState.files.delete(oldNormalized)
					ensureDir(parentPath(newNormalized))
					testState.files.set(newNormalized, content)
					return
				}
				if (!testState.dirs.has(oldNormalized)) throw new Error(`Missing path: ${oldPath}`)
				ensureDir(parentPath(newNormalized))
				for (const dir of Array.from(testState.dirs.keys())) {
					if (dir === oldNormalized || dir.startsWith(`${oldNormalized}/`)) {
						testState.dirs.delete(dir)
						testState.dirs.add(dir.replace(oldNormalized, newNormalized))
					}
				}
				for (const file of Array.from(testState.files.keys())) {
					if (file.startsWith(`${oldNormalized}/`)) {
						const content = testState.files.get(file)!
						testState.files.delete(file)
						testState.files.set(file.replace(oldNormalized, newNormalized), content)
					}
				}
			}),
			createDir: vi.fn(async (path: string) => ensureDir(path)),
			listDir: vi.fn(async (path: string): Promise<FileEntry[]> => {
				const normalized = normalizePath(path)
				if (!testState.dirs.has(normalized)) throw new Error(`Missing dir: ${path}`)
				const entries = new Map<string, FileEntry>()
				for (const dir of testState.dirs.keys()) {
					if (dir === normalized || !dir.startsWith(`${normalized}/`)) continue
					const name = dir.slice(normalized.length + 1).split("/")[0]
					const childPath = `${normalized}/${name}`
					entries.set(childPath, { path: childPath, name, isDir: true })
				}
				for (const file of testState.files.keys()) {
					if (!file.startsWith(`${normalized}/`)) continue
					const name = file.slice(normalized.length + 1).split("/")[0]
					const childPath = `${normalized}/${name}`
					if (!entries.has(childPath)) {
						entries.set(childPath, { path: childPath, name, isDir: false })
					}
				}
				return Array.from(entries.values())
			}),
			hashFile: vi.fn(),
			startWatching: vi.fn(),
			downloadFile: vi.fn(async (url: string, destPath: string) => {
				const content = testState.downloads.get(url)
				if (content === undefined) throw new Error(`Missing download: ${url}`)
				const platform = testState.platform as ReturnType<typeof createPlatform>
				await platform.fs.writeFile(destPath, content)
			}),
			downloadAndExtract: vi.fn(async (_url: string, destDir: string) => {
				for (const [path, content] of testState.archiveFiles) {
					const platform = testState.platform as ReturnType<typeof createPlatform>
					await platform.fs.writeFile(`${destDir}/${path}`, content)
				}
			}),
		},
	}
}

function registerDownloads(files: Record<string, string>) {
	for (const [name, content] of Object.entries(files)) {
		testState.downloads.set(`${name}-url`, content)
	}
}

function createReloadPlugins() {
	return vi.fn(async () => {
		const manifestPath = `${pluginsDir}/test-plugin/manifest.json`
		const manifest = testState.files.get(manifestPath)
		if (!manifest) return
		testState.pluginState.plugins["test-plugin"] = {
			manifest: JSON.parse(manifest),
			status: "loaded",
		}
	})
}

function hasInstalledPath(path: string) {
	return testState.files.has(`${pluginsDir}/test-plugin/${path}`)
}

function hasPartialInstallWorkspace() {
	return [...testState.files.keys(), ...testState.dirs.keys()].some((path) =>
		path.includes(".test-plugin-install-"),
	)
}

beforeEach(() => {
	testState.files.clear()
	testState.dirs.clear()
	testState.downloads.clear()
	testState.archiveFiles.clear()
	testState.pluginState.plugins = {}
	testState.pluginState.unregisterPlugin.mockImplementation((id: string) => {
		delete testState.pluginState.plugins[id]
	})
	testState.platform = createPlatform()
	testState.release = createRelease([
		createAsset("manifest.json"),
		createAsset("main.js"),
		createAsset("styles.css"),
	])
	ensureDir(pluginsDir)
	registerDownloads({
		"manifest.json": createManifest(),
		"main.js": "module.exports = class TestPlugin {}",
		"styles.css": ".test-plugin {}",
	})
})

describe("installPlugin", () => {
	it("downloads release assets, promotes the plugin, and reloads discovery", async () => {
		const reloadPlugins = createReloadPlugins()

		await installPlugin(entry, pluginsDir, reloadPlugins)

		expect(hasInstalledPath("manifest.json")).toBe(true)
		expect(hasInstalledPath("main.js")).toBe(true)
		expect(hasInstalledPath("styles.css")).toBe(true)
		expect(reloadPlugins).toHaveBeenCalledWith(pluginsDir)
		expect(testState.pluginState.plugins["test-plugin"]).toBeDefined()
		expect(hasPartialInstallWorkspace()).toBe(false)
	})

	it("installs release assets without optional styles.css", async () => {
		testState.release = createRelease([createAsset("manifest.json"), createAsset("main.js")])
		testState.downloads.delete("styles.css-url")
		const reloadPlugins = createReloadPlugins()

		await installPlugin(entry, pluginsDir, reloadPlugins)

		expect(hasInstalledPath("manifest.json")).toBe(true)
		expect(hasInstalledPath("main.js")).toBe(true)
		expect(hasInstalledPath("styles.css")).toBe(false)
		expect(testState.pluginState.plugins["test-plugin"]).toBeDefined()
	})

	it("falls back to the source zipball when required release assets are missing", async () => {
		testState.release = createRelease([])
		testState.archiveFiles.set("package/manifest.json", createManifest())
		testState.archiveFiles.set("package/main.js", "module.exports = class TestPlugin {}")
		testState.archiveFiles.set("package/styles.css", ".test-plugin {}")
		const reloadPlugins = createReloadPlugins()

		await installPlugin(entry, pluginsDir, reloadPlugins)

		expect(hasInstalledPath("manifest.json")).toBe(true)
		expect(hasInstalledPath("main.js")).toBe(true)
		expect(hasInstalledPath("styles.css")).toBe(true)
		expect(testState.pluginState.plugins["test-plugin"]).toBeDefined()
	})

	it("fails when manifest id does not match the registry entry", async () => {
		registerDownloads({
			"manifest.json": createManifest({ id: "other-plugin" }),
			"main.js": "module.exports = class TestPlugin {}",
		})

		await expect(installPlugin(entry, pluginsDir, createReloadPlugins())).rejects.toThrow(
			'Release manifest id must be "test-plugin"',
		)

		expect(hasInstalledPath("manifest.json")).toBe(false)
		expect(hasPartialInstallWorkspace()).toBe(false)
	})

	it("fails when manifest main is not a safe relative path", async () => {
		registerDownloads({
			"manifest.json": createManifest({ main: "../main.js" }),
			"main.js": "module.exports = class TestPlugin {}",
		})

		await expect(installPlugin(entry, pluginsDir, createReloadPlugins())).rejects.toThrow(
			"Invalid plugin main path",
		)

		expect(hasInstalledPath("manifest.json")).toBe(false)
		expect(hasPartialInstallWorkspace()).toBe(false)
	})

	it("cleans the promoted plugin when discovery does not register it", async () => {
		const reloadPlugins = vi.fn(async () => {})

		await expect(installPlugin(entry, pluginsDir, reloadPlugins)).rejects.toThrow(
			"could not be loaded",
		)

		expect(hasInstalledPath("manifest.json")).toBe(false)
		expect(testState.pluginState.plugins["test-plugin"]).toBeUndefined()
	})
})
