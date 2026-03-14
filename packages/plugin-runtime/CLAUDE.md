# CLAUDE.md — @cortex/plugin-runtime

## Purpose

`@cortex/plugin-runtime` is the **host-side** plugin system implementation. It is consumed only by `apps/desktop` (and future `apps/mobile`), never by plugin authors. Plugin authors import `@cortex/plugin-api` instead.

## Package Structure

```
packages/plugin-runtime/
  src/
    apis/
      CommandsAPI.ts     # Command registry (moved from apps/desktop) + scoped plugin wrapper
      SettingsAPI.ts     # Plugin settings read/write to .cortex/plugins/<id>/settings.json
      DataAPI.ts         # Plugin data persistence in .cortex/plugins/<id>/data/
      VaultAPI.ts        # Scoped file I/O via getPlatform().fs with path validation
      EditorAPI.ts       # CM6 extension registration + cursor operations
      RendererAPI.ts     # Renderer plugin registration
      HotkeysAPI.ts      # Hotkey binding registration
      MetadataAPI.ts     # Frontmatter + tags read access
      ThemeAPI.ts        # Theme registration + active theme queries
      WorkspaceAPI.ts    # Open files, active file subscriptions
    rendering/
      PluginSettingsRenderer.tsx  # Renders plugin settings forms from schema
      PluginViewRenderer.tsx      # Maps ViewDescriptor → React components
    pluginStore.ts       # Zustand store: loaded plugins, enabled state, aggregated registrations
    PluginLoader.ts      # Discovery, lifecycle (load/enable/disable/unload)
    PluginAPIFactory.ts  # Creates scoped PluginAPI per plugin
    index.ts
```

## Key Exports

### Command Registry (moved from apps/desktop)
- `registerCommand(command)` — registers a command, returns unregister function
- `getCommands()` — returns all registered commands
- `executeCommand(id)` — executes a command by ID
- `CommandEntry` — type with `icon?: CommandIcon` (supports both `ComponentType` and string)

### Plugin Lifecycle
- `registerBundledPlugin(manifest, module)` — registers a bundled plugin
- `enablePlugin(pluginId, getVaultPath)` — loads, instantiates, and enables a plugin
- `disablePlugin(pluginId)` — unloads and disposes a plugin
- `loadEnabledPlugins(vaultPath, getVaultPath)` — loads all enabled plugins from `.cortex/plugins.json`
- `disableAllPlugins()` — disables all currently active plugins
- `saveEnabledPlugins(vaultPath)` — persists enabled plugin IDs

### Plugin Store (Zustand)
- `usePluginStore` — reactive state for UI integration
- Tracks: plugins, sidebarItems, statusBarItems, settingsTabs, views, contextMenuItems, ribbonActions

### Bridge Functions (called by apps/desktop to wire APIs to real implementations)
- `setEditorViewRef(view)` — provides CM6 EditorView for cursor operations
- `setReconfigurePluginExtensions(fn)` — provides reconfigure function from @cortex/editor
- `setHotkeyHandlerFunctions(register, unregister)` — wires to @cortex/hotkeys store
- `setMetadataFunctions({...})` — wires frontmatter parsing and tag queries
- `setThemeManagerRef(manager)` — wires to ThemeManager instance
- `setWorkspaceFunctions({...})` — wires to workspace/editor stores

## API Status

| API | Status | Description |
|-----|--------|-------------|
| `commands` | Done | Register/execute commands, auto-prefixed with plugin ID |
| `settings` | Done | Read/write plugin settings, change listeners, schema definition |
| `vault` | Done | Scoped file I/O with `../` escape prevention |
| `data` | Done | Plugin data persistence with filename validation |
| `ui` | Done | Sidebar, statusbar, views, context menu, ribbon, settings tabs (via plugin store) |
| `editor` | Done | CM6 extension registration via Compartment, cursor operations |
| `renderer` | Done | Renderer plugin registration (stored, consumed by Renderer component) |
| `hotkeys` | Done | Hotkey binding registration via bridge functions |
| `metadata` | Done | Frontmatter + tags read access via bridge functions |
| `theme` | Done | Theme registration + active theme queries via ThemeManager bridge |
| `workspace` | Done | Open files, active file subscriptions via bridge functions |

## Bridge Pattern

APIs that depend on packages not directly imported by plugin-runtime (e.g., @cortex/core stores, @cortex/editor, @cortex/theme) use a **bridge pattern**: module-level setter functions that apps/desktop calls during initialization to wire the API to real implementations. This keeps plugin-runtime's dependency graph minimal while enabling full functionality.

## Plugin Data Layout

```
vault/.cortex/
  plugins.json                        # { "enabled": ["daily-notes", ...] }
  plugins/
    <plugin-id>/
      settings.json                   # Plugin settings (from schema)
      data/                           # Free-form plugin data
```

## Dependencies

- `@cortex/plugin-api` — types and base class
- `@cortex/platform` — file system access via `getPlatform()`
- `zustand` + `immer` — plugin store state management
- `react` (peer) — for `ComponentType` in `CommandIcon`
