export { installPlugin, installTheme, uninstallPlugin, uninstallTheme } from "./installService"
export {
	isEntryInstalled,
	type MarketplaceCallbacks,
	type MarketplaceSortOrder,
	type MarketplaceState,
	type MarketplaceTab,
	setMarketplaceCallbacks,
	useMarketplaceStore,
} from "./marketplaceStore"
export {
	fetchLatestRelease,
	fetchManifestMinVersion,
	fetchPluginRegistry,
	fetchReadme,
	fetchThemeRegistry,
	invalidateRegistryCache,
} from "./registryService"
export type { GitHubRelease, GitHubReleaseAsset, RegistryEntry } from "./types"
export { detectAvailableUpdates, readInstalledVersion } from "./updateService"
export { compareVersions, isVersionCompatible } from "./versionUtils"
