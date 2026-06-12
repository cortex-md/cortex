# CLAUDE.md — apps/desktop

This file provides guidance for working with the Tauri desktop application frontend.

## Overview

`apps/desktop` is the Tauri shell + React frontend. It composes packages from `@cortex/*` into a full desktop application. The frontend is built with React 19 + TypeScript + Vite.

## Structure

```
src/
  main.tsx              # React entry, calls initPlatform(tauriAdapter)
  App.tsx               # Root shell composition and high-level app state
  bootstrap/            # Host bridges and bundled plugin registration
  components/           # Desktop-specific UI (FileSidebar, PaneView, etc.)
  features/             # Feature modules (sync/, editor/, etc.)
  hooks/                # Commands and app/plugin/theme/workspace/window lifecycles
  styles.css            # Design system CSS
src-tauri/              # Rust source (Tauri commands, sync engine)
```

## Native Shell and Settings

The main app and Settings use separate Tauri webview windows. `main.tsx` renders `App` by default and `SettingsWindow` when `?window=settings` is present. Components should continue calling `useUIStore().openSettings(section)` or `openMarketplace(tab)`; the desktop app bridges that state through `getPlatform().window.openSettings(...)`.

`SettingsModal` remains as a fallback for cases where there is no active vault or native window creation fails. Shared settings layout belongs in `SettingsContent`, not in window-specific wrappers.

Settings form sections should use `SettingsPage`, `SettingsBlock`, `SettingsField`, `SettingsList`, and `SettingsEmptyState` from `features/settings/SettingsPrimitives`. Keep Marketplace as its own browser-style settings view, but use the shared settings primitives for General, Appearance, Editor, Hotkeys, Sync, Plugins, and plugin-declared settings.

Appearance settings may override only font families and font sizes. UI/editor font weights and line heights are theme CSS tokens (`--ui-font-weight`, `--ui-line-height`, `--editor-font-weight`, `--editor-line-height`) and should not be written by runtime appearance overrides.

`tauri.conf.json` should stay platform-neutral. macOS chrome belongs in `tauri.macos.conf.json`; Windows chrome belongs in `tauri.windows.conf.json`.

Window-level native materials should come from Tauri/window effects. Do not add CSS blur to app chrome that is meant to show native vibrancy, Mica, or acrylic.

## Workspace Layout

`SplitPaneView` renders the recursive workspace tree and `PaneView` owns each pane's tab bar, file editor tabs, and view tabs. Tabs can contain files or declarative plugin/core views. Drag sources are tabs, file rows from `FileSidebar`, and sidebar view items. `DropZoneOverlay` covers pane content for center/edge split drops, while `TabBar` owns insertion targets for dropping before or after existing tabs.

Workspace tabs keep a fixed width with truncated titles so tab order changes do not resize neighboring tabs. Keep motion limited to subtle create, close, drag, and drop marker states.

The left sidebar's persisted width lives in `uiStore`, but live resize feedback should stay local/imperative during the drag and commit the final clamped width only on mouseup.

`FileSidebar` builds its hierarchy in O(n), flattens expanded rows, and virtualizes the result with
`@tanstack/react-virtual`. Keep file tree construction pure in `fileTree.ts`; row components must
subscribe only to visible row state.

App-level bridges belong in `bootstrap/pluginBridges.ts`. Lifecycle effects and command wiring belong
in dedicated hooks; native menu listeners belong in `hooks/useNativeMenuEvents.ts`. `App.tsx` should
remain focused on shell composition.

## Marketplace

Marketplace UI lives under `features/marketplace/` as settings content, not as a standalone modal. Buttons that browse community plugins or themes should call `useUIStore().openMarketplace(tab)`, which opens Settings on the Marketplace tab and selects the requested marketplace tab.

Marketplace search occupies the full Settings content area. Selecting a plugin or theme replaces the search view with the detail view, including README, compatibility, install/update/uninstall actions, and a back button to return to search.

Marketplace plugin install and compatibility flows use native Tauri downloads for GitHub release assets (`download_file` and `download_text`) so browser CORS/redirect behavior does not affect release-hosted `manifest.json`, `main.js`, or `styles.css`.

## Testing

Tests live in `src/__tests__/`. Run with:

```bash
bun run --cwd apps/desktop vitest run
# or from the monorepo root:
bun run test
```

### Test Stack

| Tool | Purpose |
|------|---------|
| `vitest` | Test runner with jsdom environment |
| `@testing-library/react` | Component mounting and querying |
| `@testing-library/user-event` | User interaction simulation |
| `@testing-library/jest-dom` | DOM matchers (`toBeInTheDocument`, etc.) |

### Test File Layout

```
src/__tests__/
  setup.ts                      # Global mocks (@cortex/platform, Tauri APIs, jest-dom)
  features/sync/
    SyncIndicator.test.tsx
    ConflictBanner.test.tsx
  hooks/
    useSyncLifecycle.test.tsx
```

### Mocking Zustand Stores

All `@cortex/core` stores must be mocked at the top of test files:

```tsx
vi.mock("@cortex/core", () => ({
  useSyncStore: vi.fn(),
  useAuthStore: vi.fn(),
  useVaultStore: vi.fn(),
  // ...
}))

import { useSyncStore } from "@cortex/core"

// In beforeEach or per-test:
vi.mocked(useSyncStore).mockReturnValue({
  engineState: "live",
  syncingFiles: {},
  // ...
} as never)
```

For stores that use selector functions (like `useAuthStore`), mock with `mockImplementation`:

```tsx
vi.mocked(useAuthStore).mockImplementation((selector?: (s: unknown) => unknown) => {
  const state = { authenticated: true, selfHosted: false }
  return selector ? selector(state) : state
})
```

### Mocking Child Components

To avoid rendering complex dependencies in component tests:

```tsx
vi.mock("../../../features/sync/SyncLogsModal", () => ({
  SyncLogsModal: () => null,
}))
```

### Setup File

`src/__tests__/setup.ts` is loaded before every test (via `vitest.config.ts`). It:
- Imports `@testing-library/jest-dom` to add DOM matchers
- Mocks `@cortex/platform`
- Mocks `@tauri-apps/api/core` and `@tauri-apps/api/event`

### Platform Mocks

`@cortex/platform` and Tauri APIs are mocked in setup.ts. If a specific test needs fine-grained control, override the mock in the test file itself using `vi.mock` (which is hoisted to the top of the module).

### Cleanup

Always call `cleanup()` in `afterEach` to unmount components between tests:

```tsx
import { cleanup } from "@testing-library/react"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```
