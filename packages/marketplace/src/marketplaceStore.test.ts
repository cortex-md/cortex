import { beforeEach, describe, expect, it, vi } from "vitest"
import { setMarketplaceCallbacks, useMarketplaceStore } from "./marketplaceStore"
import type { RegistryEntry } from "./types"

const testState = vi.hoisted(() => ({
	installPlugin: vi.fn(),
	installTheme: vi.fn(),
	uninstallPlugin: vi.fn(),
	uninstallTheme: vi.fn(),
}))

vi.mock("./installService", () => ({
	installPlugin: testState.installPlugin,
	installTheme: testState.installTheme,
	uninstallPlugin: testState.uninstallPlugin,
	uninstallTheme: testState.uninstallTheme,
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: () => ({
		app: {
			getCurrentAppVersion: vi.fn(async () => "0.1.0"),
		},
	}),
}))

vi.mock("./registryService", () => ({
	fetchLatestRelease: vi.fn(),
	fetchManifestMinVersion: vi.fn(),
	fetchPluginRegistry: vi.fn(async () => []),
	fetchReadme: vi.fn(),
	fetchThemeRegistry: vi.fn(async () => []),
	invalidateRegistryCache: vi.fn(),
}))

vi.mock("./updateService", () => ({
	detectAvailableUpdates: vi.fn(async () => ({})),
}))

const entry: RegistryEntry = {
	id: "test-plugin",
	name: "Test Plugin",
	author: "Tester",
	description: "A plugin",
	coverImageUrl: "",
	repo: "owner/test-plugin",
}

beforeEach(() => {
	vi.clearAllMocks()
	useMarketplaceStore.setState({
		activeTab: "plugins",
		loadingEntryId: null,
		installError: null,
		availableUpdates: { "test-plugin": "1.1.0" },
	})
	setMarketplaceCallbacks({
		getPluginsDir: () => "/vault/.cortex/plugins",
		getThemesDir: () => "/vault/.cortex/themes",
		reloadPlugins: vi.fn(),
		reloadThemes: vi.fn(),
		isPluginInstalled: () => false,
		isThemeInstalled: () => false,
	})
})

describe("marketplaceStore installEntry", () => {
	it("stores install errors without rejecting", async () => {
		testState.installPlugin.mockRejectedValueOnce(new Error("download failed"))

		await expect(useMarketplaceStore.getState().installEntry(entry)).resolves.toBeUndefined()

		const state = useMarketplaceStore.getState()
		expect(state.installError).toBe("download failed")
		expect(state.loadingEntryId).toBeNull()
		expect(state.availableUpdates["test-plugin"]).toBe("1.1.0")
	})
})
