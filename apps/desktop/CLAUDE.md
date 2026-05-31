# CLAUDE.md — apps/desktop

This file provides guidance for working with the Tauri desktop application frontend.

## Overview

`apps/desktop` is the Tauri shell + React frontend. It composes packages from `@cortex/*` into a full desktop application. The frontend is built with React 19 + TypeScript + Vite.

## Structure

```
src/
  main.tsx              # React entry, calls initPlatform(tauriAdapter)
  App.tsx               # Root component: layout, providers, keyboard shortcuts
  components/           # Desktop-specific UI (FileSidebar, PaneView, etc.)
  features/             # Feature modules (sync/, editor/, etc.)
  hooks/                # React hooks (useSyncLifecycle, etc.)
  styles.css            # Design system CSS
src-tauri/              # Rust source (Tauri commands, sync engine)
```

## Settings and Marketplace

`SettingsModal` owns settings navigation, including the embedded Marketplace tab. Marketplace UI lives under `features/marketplace/` as settings content, not as a standalone modal. Buttons that browse community plugins or themes should call `useUIStore().openMarketplace(tab)`, which opens Settings on the Marketplace tab and selects the requested marketplace tab.

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
