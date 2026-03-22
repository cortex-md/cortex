# CLAUDE.md — @cortex/marketplace

## Purpose

`@cortex/marketplace` provides the shared marketplace logic for browsing, installing, and uninstalling community plugins and themes from the Cortex registry at `cortex-md/registry` on GitHub.

This package is platform-agnostic — it uses `@cortex/platform` abstractions for HTTP and filesystem operations, making it usable on both desktop (Tauri) and mobile.

## Package Structure

```
packages/marketplace/
  src/
    types.ts              # RegistryEntry, GitHubRelease, GitHubReleaseAsset
    registryService.ts    # Fetch + cache registry JSON and README from GitHub
    installService.ts     # Download zip, extract, trigger plugin/theme discovery
    marketplaceStore.ts   # Zustand store for UI state
    index.ts              # Public exports
```

## Registry Format

The registry lives at `https://raw.githubusercontent.com/cortex-md/registry/main/`:
- `plugins.json` — array of `RegistryEntry`
- `themes.json` — array of `RegistryEntry`

```typescript
interface RegistryEntry {
  id: string
  name: string
  author: string
  description: string
  coverImageUrl: string   // may be empty string
  repo: string            // "owner/repo"
}
```

## Installation Flow

1. Fetch `https://api.github.com/repos/{owner}/{repo}/releases/latest`
2. Find first `.zip` asset, fall back to `zipball_url`
3. Call `platform.fs.downloadAndExtract(zipUrl, destDir)` — Rust command downloads + extracts
4. Re-run discovery (plugin or theme) to register the new entry

Zip contents should be flat (no top-level directory) for plugins:
- `manifest.json`
- `main.js`

For themes:
- `manifest.json`
- `dark.css`, `light.css`

If the zip has a single top-level directory (GitHub source zip format), the Rust extractor strips it automatically.

## Bridge Pattern

`setMarketplaceCallbacks(callbacks)` must be called by `apps/desktop` during initialization to wire platform-specific operations:

```typescript
setMarketplaceCallbacks({
  getPluginsDir: () => vault?.path ? `${vault.path}/.cortex/plugins` : null,
  getThemesDir: () => vault?.path ? `${vault.path}/.cortex/themes` : null,
  reloadPlugins: discoverCommunityPlugins,
  reloadThemes: loadCommunityThemes,
  isPluginInstalled: (id) => id in usePluginStore.getState().plugins,
  isThemeInstalled: (id) => getThemeManager().getThemeFamilies().some(f => f.name === id),
})
```

## Key Exports

- `useMarketplaceStore` — Zustand store with all UI state and actions
- `setMarketplaceCallbacks(cbs)` — Wire platform-specific callbacks (call once at app init)
- `isEntryInstalled(id, tab)` — Check if a plugin/theme is installed
- `RegistryEntry` — Type for registry entries
- `fetchPluginRegistry() / fetchThemeRegistry()` — Fetch with in-memory cache
- `fetchReadme(repo)` — Fetch README.md from GitHub (tries main, then master branch)
- `invalidateRegistryCache()` — Force re-fetch on next loadRegistry()

## Dependencies

- `@cortex/platform` — `getPlatform().http.fetch()` for network, `getPlatform().fs.downloadAndExtract()` for install
- `@cortex/plugin-runtime` — `discoverCommunityPlugins()`, `usePluginStore`
- `@cortex/theme` — `getThemeManager()` for theme registration checks
- `zustand` + `immer` — state management
