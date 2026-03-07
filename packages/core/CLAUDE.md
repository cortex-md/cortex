# CLAUDE.md — @cortex/core

This file provides guidance to Claude Code (claude.ai/code) when working with state management in the Cortex core package.

## Purpose

`@cortex/core` exports:
- **Zustand stores** — React hooks for global state (vaultStore, editorStore, workspaceStore, uiStore)
- **NoteCache** — In-memory file cache with auto-save and snapshots
- Supporting utilities and types

All stores follow consistent patterns using **Zustand + Immer** for immutable-style updates.

## Store Pattern

Every store uses this structure:

```typescript
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface MyState {
  // State properties
  count: number
  items: string[]

  // Action methods
  increment: () => void
  addItem: (item: string) => void
  asyncAction: () => Promise<void>
}

export const useMyStore = create<MyState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      count: 0,
      items: [],

      // Synchronous actions
      increment: () =>
        set((state) => {
          state.count++
        }),

      addItem: (item) =>
        set((state) => {
          state.items.push(item)
        }),

      // Async actions can use get()
      asyncAction: async () => {
        const current = get().count
        // ... do something
        set((state) => {
          state.count = current + 1
        })
      },
    })),
    { name: "myStore" }, // DevTools name
  ),
)
```

## Key Patterns

### 1. Types First
Define the state interface before implementation:

```typescript
export interface MyState {
  // Data
  value: string | null
  loading: boolean
  error: string | null

  // Actions
  fetchValue: (id: string) => Promise<void>
  clear: () => void
}
```

This makes the store's public API crystal clear.

### 2. Immer Mutations Look Like Mutations
With Immer, you write code that *looks* like mutations, but creates immutable updates:

```typescript
// ✅ Looks like mutation, but immutable under the hood
set((state) => {
  state.count++
  state.items.push(newItem)
  state.nested.value = newValue
})

// ❌ Don't manually spread — Immer does that
set((state) => ({
  ...state,
  count: state.count + 1,
}))
```

### 3. Async Actions Use get()
For async operations, access current state via `get()`:

```typescript
openVault: async (path: string) => {
  const platform = getPlatform()
  set({ loading: true, error: null })
  try {
    const metadata = await platform.vault.openVault(path)
    const files = await platform.vault.scanVault(path)
    const stopWatcher = await platform.fs.startWatching(path, () => {
      get().refreshFiles() // Call another action via get()
    })
    set((state) => {
      state.vault = metadata
      state.files = files
      state.loading = false
      state.stopWatcher = stopWatcher
    })
  } catch (e) {
    set((state) => {
      state.loading = false
      state.error = String(e)
    })
  }
}
```

### 4. Use in Components
Components call stores as hooks:

```typescript
export default function App() {
  // Destructure what you need
  const { count, increment, asyncAction } = useMyStore()

  const handleClick = async () => {
    await asyncAction()
  }

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+1</button>
      <button onClick={handleClick}>Async</button>
    </div>
  )
}
```

Zustand automatically re-renders only components that use changed state (shallow comparison).

### 5. Early Returns
Don't set state if operation is not needed:

```typescript
refreshFiles: async () => {
  const { vault } = get()
  if (!vault) return  // Early return if no vault
  try {
    const files = await getPlatform().vault.scanVault(vault.path)
    set((state) => {
      state.files = files
    })
  } catch (_e) {}  // Silently ignore errors
}
```

## Existing Stores

### vaultStore
Manages the current vault (folder) and its file tree:

```typescript
export interface VaultState {
  vault: VaultMetadata | null        // Current vault metadata
  files: FileEntry[]                 // Files in vault
  loading: boolean
  error: string | null
  stopWatcher: (() => void) | null   // Function to stop file watcher

  openVault: (path: string) => Promise<void>
  closeVault: () => Promise<void>
  refreshFiles: () => Promise<void>
}
```

**Usage**: `const { vault, files, openVault } = useVaultStore()`

### editorStore
Tracks the currently active file and editor state:

```typescript
export interface EditorState {
  activeFilePath: string | null
  mode: EditorMode  // "source" | "live-preview" | "reading"
  cursor: CursorPosition | null

  setActiveFile: (filePath: string | null) => void
  updateCursor: (cursor: CursorPosition) => void
  setMode: (mode: EditorMode) => void
  flushActive: () => Promise<void>  // Flush current file to disk
}
```

**Usage**: `const { activeFilePath, mode, setMode } = useEditorStore()`

### workspaceStore
Manages the layout (split panes, tabs, their positions):

```typescript
export interface WorkspaceState {
  splitTree: SplitTree                    // Recursive layout tree
  panes: Map<PaneId, Pane>               // All panes by ID
  activePaneId: PaneId | null            // Currently focused pane
  // ... + many layout actions

  resizeSplit: (nodeId: string, delta: number) => void
  closeTab: (paneId: PaneId, tabIndex: number) => void
  goToTabIndex: (paneId: PaneId, tabIndex: number) => void
  loadWorkspace: (vaultPath: string) => Promise<void>
  persistWorkspace: (vaultPath: string) => void
}
```

**Usage**: Complex layout operations. See `apps/desktop/src/App.tsx` for examples.

### uiStore
Manages sidebar collapsed/width state:

```typescript
export interface UIState {
  leftSidebarCollapsed: boolean
  leftSidebarWidth: number
  leftSidebarView: "files" | "search" | "bookmarks" | "tags"

  toggleLeftSidebar: () => void
  setLeftSidebarWidth: (width: number) => void
  setLeftSidebarView: (view: string) => void
}
```

**Usage**: `const { leftSidebarWidth, setLeftSidebarWidth } = useUIStore()`

## NoteCache

The `NoteCache` class manages file contents with caching and auto-save:

```typescript
// Access via singleton
import { noteCache } from "@cortex/core"

// Lifecycle
noteCache.start()              // Start auto-save timer
noteCache.stop()               // Stop timer
await noteCache.openTab(path)  // Load file into cache
await noteCache.closeTab(path) // Unload from cache
await noteCache.write(path, content, metadata)  // Write to cache
await noteCache.flush(path)    // Flush to disk
```

**Key features**:
- Reads from disk on `openTab()`
- Auto-saves every 2 seconds while file is open
- Tracks diffs for undo/redo snapshots
- Flushes on app close or explicit call

## Adding a New Store

1. **Create file**: `packages/core/src/stores/myStore.ts`
2. **Define interface**: `export interface MyState { ... }`
3. **Implement store**: Use Zustand + Immer + devtools pattern
4. **Export from index**: Add to `packages/core/src/index.ts`
5. **Use in components**: `const { state, action } = useMyStore()`

Example:

```typescript
// packages/core/src/stores/myStore.ts
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface MyState {
  items: string[]
  addItem: (item: string) => void
  removeItem: (item: string) => void
}

export const useMyStore = create<MyState>()(
  devtools(
    immer((set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          state.items.push(item)
        }),
      removeItem: (item) =>
        set((state) => {
          state.items = state.items.filter((i) => i !== item)
        }),
    })),
    { name: "myStore" },
  ),
)
```

Then export from `packages/core/src/index.ts`:
```typescript
export { useMyStore } from "./stores/myStore"
export type { MyState } from "./stores/myStore"
```

## Store Dependency Graph

Stores **should not directly depend on each other**, but may read state via `get()`:

```
vaultStore (file operations)
  ├─ uses getPlatform() → platform abstraction

editorStore (editor state)
  └─ no dependencies

workspaceStore (layout)
  ├─ reads vaultStore.vault (for persistence path)
  └─ reads editorStore.activeFilePath (for context)

uiStore (UI chrome)
  └─ no dependencies

noteCache (file cache)
  ├─ uses getPlatform() → file I/O
  └─ triggered by editor/workspace
```

Keep dependencies minimal. If you need state from another store, use `useOtherStore.getState()` inside an action (not in component).

## Zustand DevTools

In development (via `devtools` middleware):
- Open browser DevTools → Redux tab
- See all store state and actions
- Time-travel debug: click actions to revert state
- Export/import state snapshots

## Testing Considerations

Stores are just functions — easy to test:

```typescript
const store = useMyStore.getState()
store.increment()
expect(store.count).toBe(1)
```

## No Side Effects in Stores

Stores should:
- ✅ Update state
- ✅ Call async platform methods
- ✅ Coordinate with other stores via `get()`
- ❌ No direct DOM manipulation
- ❌ No window.location changes
- ❌ No unrelated side effects

If you need side effects, handle them in components or via useEffect.

## Performance

Zustand uses **shallow comparison** for re-renders:

```typescript
// ✅ Only component using `count` re-renders when count changes
const count = useMyStore((state) => state.count)

// ✅ More selective subscriptions prevent unnecessary re-renders
const { count, increment } = useMyStore((state) => ({
  count: state.count,
  increment: state.increment,
}))

// ⚠️ Less common but valid — whole state
const state = useMyStore()
```

For large stores, consider selector functions to minimize re-renders.

## Building & Debugging

```bash
# Type check
bun run typecheck

# Lint & format
bun run check
bun run check:fix

# Import in app
import { useVaultStore, useEditorStore } from "@cortex/core"
```

Stores are tree-shaken at build time, so importing only what you need is efficient.
