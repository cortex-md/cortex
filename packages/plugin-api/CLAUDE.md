# CLAUDE.md — @cortex/plugin-api

## Purpose

`@cortex/plugin-api` is the **public contract** that plugin authors import. It has **zero dependencies** — only TypeScript types and one abstract base class.

Plugins depend on this package. The host app (`apps/desktop`) and `packages/plugin-runtime` implement the interfaces defined here.

Published as `cortex-plugin-api` on npm. Local workspace packages reference it via `"cortex-plugin-api": "workspace:*"`.

## Package Structure

```
packages/plugin-api/
  src/
    types.ts    # All interfaces: Manifest, PluginAPI, ViewDescriptor, Settings, LivePreview, etc.
    Plugin.ts   # CortexPlugin abstract base class with auto-cleanup
    index.ts    # Re-exports
```

## Key Exports

### CortexPlugin (abstract class)
Base class for all plugins. Runtime sets `manifest` and `api` before calling `onload()`.

Convenience methods auto-track disposables for cleanup on unload:
- `addCommand(command)` → registers via `api.commands`
- `registerEditorExtension(ext)` → registers via `api.editor`
- `registerLivePreview(declaration)` → registers via `api.editor` (declarative live preview)
- `registerMarkdownProcessor(plugin)` → registers via `api.renderer`
- `registerCodeBlockProcessor(lang, handler)` → registers via `api.renderer`
- `registerView(registration)` → registers via `api.ui`
- `registerSettingsTab(tab)` → registers via `api.ui`, auto-wires `onChange` from setting definitions

`_disposeAll()` is called by the runtime on unload to clean up all tracked disposables.

### PluginAPI (interface)
The scoped API surface injected into each plugin. Sub-APIs:
- `commands` — register/execute commands (supports `defaultHotkey` for auto-binding)
- `settings` — read/write plugin settings, define schema (supports inline `onChange`)
- `vault` — scoped file I/O (relative paths only)
- `editor` — CM6 extensions, live preview declarations, cursor operations
- `renderer` — remark/rehype plugins, code block processors
- `ui` — views, sidebar, statusbar, context menu, ribbon, notices
- `hotkeys` — keyboard shortcut registration
- `metadata` — frontmatter and tag access
- `data` — plugin data persistence
- `theme` — theme registration
- `workspace` — open files, active file events
- `bookmarks` — read/write bookmarks, subscribe to changes
- `notifications` — native app notifications, gated by the `notifications` manifest capability

### LivePreviewDeclaration (type)
Declarative API for creating CodeMirror live preview decorations without importing CM6:
- `inlineRules` — regex pattern matching with text/widget/mark replacements
- `cursorAware` — auto-hides decorations when cursor is in range (default: true)
- `LivePreviewWidgetDescriptor` — describes DOM element (tag, textContent, className, attributes)

### PluginSettingDefinition (interface)
Supports inline `onChange` callback for reactive settings — no need to call `api.settings.onChange()` separately.

### PluginCommand (interface)
Supports `defaultHotkey` — auto-registers as a customizable hotkey binding when command is registered.

### Capabilities (PluginCapability)
Declared permissions: `vault:read/write/delete/watch`, `editor:extensions`, `renderer:plugins`, `ui:views/sidebar/statusbar/contextmenu`, `commands`, `hotkeys`, `settings`, `themes`, `bookmarks:read`, `bookmarks:write`, `notifications`.

### ViewDescriptor (type)
Declarative UI tree (JSON-serializable). Plugins describe UI as `ViewNode` trees; the host renders per-platform. Plugins never touch DOM/CSS directly.

### PluginManifest (interface)
Metadata for plugin discovery: id, name, version, author, icon (lucide name string), capabilities.

## Design Constraints

- **Zero dependencies** — this package must never depend on React, CodeMirror, Tauri, or any platform-specific code
- **Cross-platform** — all types must work on desktop (Tauri) and future mobile (React Native)
- **Icons by name** — plugins reference icons as strings (e.g. `"calendar"`), never import icon components
- **Relative paths** — vault file operations use paths relative to vault root
- **Declarative UI** — plugins describe UI structure via ViewDescriptor, never render components directly

## Plugin Lifecycle

```
DISCOVERED → LOADED → ENABLED → DISABLED → UNLOADED
```

1. Runtime reads manifest, validates capabilities
2. Creates scoped `PluginAPI` instance
3. Sets `plugin.manifest` and `plugin.api`
4. Calls `plugin.onload()` — plugin registers features
5. On disable: calls `plugin.onunload()`, then `plugin._disposeAll()`
