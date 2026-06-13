# CLAUDE.md — @cortex/plugin-runtime

## Purpose

`@cortex/plugin-runtime` is the **host-side** plugin system implementation. It is consumed only by `apps/desktop` (and future `apps/mobile`), never by plugin authors. Plugin authors import `cortex-plugin-api` instead.

## Package Structure

```
packages/plugin-runtime/
  src/
    apis/
      CommandsAPI.ts     # Command registry + scoped plugin wrapper (supports defaultHotkey)
      SettingsAPI.ts     # Plugin settings read/write to .cortex/plugins/<id>/settings.json
      DataAPI.ts         # Plugin data persistence in .cortex/plugins/<id>/data/
      VaultAPI.ts        # Scoped file I/O via getPlatform().fs with path validation
      EditorAPI.ts       # CM6 extension registration + live preview builder bridge + cursor operations
      MarkdownAPI.ts     # Shared Markdown registration
      HotkeysAPI.ts      # Hotkey binding registration + dynamic bindings for command hotkeys
      MetadataAPI.ts     # Frontmatter + tags read access
      ThemeAPI.ts        # Theme registration + active theme queries
      WorkspaceAPI.ts    # Open files/views, target splits, active file subscriptions
      BookmarksAPI.ts    # Bookmark read/write/subscribe via bridge
      NotificationsAPI.ts # Native notification bridge with capability enforcement
    rendering/
      PluginSettingsRenderer.tsx  # Renders plugin settings forms from injected controls
      PluginViewRenderer.tsx      # Maps ViewDescriptor → React components with optional controlled state
      settingsControls.ts         # Platform-agnostic component contract for settings renderer
    pluginStore.ts       # Zustand store: loaded plugins, enabled state, aggregated registrations
    PluginLoader.ts      # Discovery, lifecycle (load/enable/disable/unload)
    pluginStyles.ts      # Parses and scopes community styles.css to Markdown surfaces
    PluginAPIFactory.ts  # Creates scoped PluginAPI per plugin
    index.ts
```

## Key Exports

### Command Registry
- `registerCommand(command)` — registers a command, returns unregister function
- `getCommands()` — returns all registered commands
- `executeCommand(id)` — executes a command by ID
- Commands with `defaultHotkey` auto-register as dynamic hotkey bindings

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
- `setDynamicBindingFunctions(add, remove)` — wires dynamic hotkey bindings for commands
- `setMetadataFunctions({...})` — wires frontmatter parsing and tag queries
- `setThemeManagerRef(manager)` — wires to ThemeManager instance
- `setWorkspaceFunctions({...})` — wires file/view opening, target splits, and active file subscriptions to workspace/editor stores
- `setBookmarksFunctions({...})` — wires to bookmarksStore
- `setNotificationFunctions({...})` — wires plugin notifications to the host platform notification service
- `setSettingsControls(components)` — injects platform-specific UI controls for settings renderer

### Settings Renderer (platform-agnostic)
- `SettingsControlComponents` — interface defining required UI controls (Switch, TextInput, NumberInput, Select, Slider, ColorPicker, Label, Description) plus optional layout wrappers (`Group`, `Field`)
- `setSettingsControls(components)` — desktop injects @cortex/ui components and settings layout wrappers, mobile injects RN components
- `PluginSettingsRenderer` — renders plugin settings using injected controls, preferring host-provided layout wrappers while preserving the legacy Label/Description fallback

## API Status

| API | Status | Description |
|-----|--------|-------------|
| `commands` | Done | Register/execute commands, auto-prefixed, supports defaultHotkey |
| `settings` | Done | Read/write plugin settings, inline onChange, schema definition |
| `vault` | Done | Scoped file I/O with `../` escape prevention |
| `data` | Done | Plugin data persistence with filename validation |
| `ui` | Done | Sidebar, statusbar, views, context menu, ribbon, settings tabs (via plugin store) |
| `editor` | Done | CM6 extension registration and cursor operations |
| `markdown` | Done | Namespaced inline/semantic rules, targeted processors, and callouts |
| `hotkeys` | Done | Hotkey binding registration + dynamic bindings via bridge functions |
| `metadata` | Done | Frontmatter + tags read access via bridge functions |
| `theme` | Done | Theme registration + active theme queries via ThemeManager bridge |
| `workspace` | Done | Open files/views, target splits, active file subscriptions via bridge functions |
| `bookmarks` | Done | Read/write/subscribe bookmarks via bridge to bookmarksStore |
| `notifications` | Done | Native notifications via bridge, manifest capability check, permission/no-op handling |

## Bridge Pattern

APIs that depend on packages not directly imported by plugin-runtime (e.g., @cortex/core stores, @cortex/editor, @cortex/theme, @cortex/ui) use a **bridge pattern**: module-level setter functions that apps/desktop calls during initialization to wire the API to real implementations. This keeps plugin-runtime's dependency graph minimal and platform-agnostic.

## Plugin Data Layout

```
vault/.cortex/
  plugins.json                        # { "enabled": ["daily-notes", ...] }
  plugins/
    <plugin-id>/
      settings.json                   # Plugin settings (from schema)
      data/                           # Free-form plugin data
```

Community plugin discovery only accepts a safe relative `manifest.main` path. Empty paths, absolute paths, Windows drive paths, and any path containing `..` are ignored before the runtime attempts to read or evaluate the bundle. The loader accepts CommonJS bundles and self-contained ESM bundles with a default plugin class export. Bare ESM imports are not resolved by the runtime, so marketplace plugins should publish bundled release assets.

An optional `styles.css` requires the `markdown:extensions` capability. Selectors are parsed with
`css-tree`, scoped to `.markdown-surface`, and installed only for the enabled plugin lifecycle.
Global or unscopable at-rules are rejected during discovery, and hot reload replaces the previous
style element.

Markdown registration IDs are scoped as `<plugin-id>:<registration-id>`. Invalid registrations fail
before changing renderer state. Loader lifecycle failures emit structured plugin diagnostics instead
of being swallowed. Plugin settings and data failures include operation, plugin, and file context.

## Dependencies

- `cortex-plugin-api` — types and base class
- `@cortex/platform` — file system access via `getPlatform()`
- `zustand` + `immer` — plugin store state management
- `react` (peer) — for `ComponentType` in `CommandIcon` and settings renderer
