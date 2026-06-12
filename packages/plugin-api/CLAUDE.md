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
- `registerMarkdownInline(registration)` → registers via `api.markdown`
- `registerMarkdownSemantic(registration)` → registers validated portable semantic output
- `registerMarkdownProcessor(processor)` → registers via `api.markdown`
- `registerCalloutType(registration)` → registers via `api.markdown`
- `registerView(registration)` → registers via `api.ui`
- `registerSettingsTab(tab)` → registers via `api.ui`, auto-wires `onChange` from setting definitions

`_disposeAll()` is called by the runtime on unload to clean up all tracked disposables.

### PluginAPI (interface)
The scoped API surface injected into each plugin. Sub-APIs:
- `commands` — register/execute commands (supports `defaultHotkey` for auto-binding)
- `settings` — read/write plugin settings, define schema (supports inline `onChange`)
- `vault` — scoped file I/O (relative paths only)
- `editor` — CM6 extensions and cursor operations
- `markdown` — shared inline/semantic rules, targeted Unified processors, and callout types
- `ui` — views, sidebar, statusbar, context menu, ribbon, notices
- `hotkeys` — keyboard shortcut registration
- `metadata` — frontmatter and tag access
- `data` — plugin data persistence
- `theme` — theme registration
- `workspace` — open files/views, target splits, active file events
- `bookmarks` — read/write bookmarks, subscribe to changes
- `notifications` — native app notifications, gated by the `notifications` manifest capability

### MarkdownInlineRegistration (type)
Declarative API applied to Live Preview and Reading View without importing CM6:
- `pattern` and `flags` define regex matching
- `priority` resolves overlaps deterministically
- `replacement` accepts text replacement or a semantic CSS class mark
- arbitrary DOM widgets are intentionally unsupported

### MarkdownSemanticRegistration (type)

Transforms text semantic nodes into validated portable nodes: text, container, span, link, image,
or code. Registrations compose by priority, and the same registration runs in Live Preview, Reading
View, and export. `registerInline` is the regex convenience API over this portable-node path.

### MarkdownProcessorRegistration (type)

Advanced Unified integration with `id`, one `phase`, explicit `surfaces`, optional `priority`, and
one typed zero-argument plugin function returning a transformer. Processor surfaces are limited to
`reading-view` and `export`.

### PluginSettingDefinition (interface)
Supports inline `onChange` callback for reactive settings — no need to call `api.settings.onChange()` separately.

### PluginCommand (interface)
Supports `defaultHotkey` — auto-registers as a customizable hotkey binding when command is registered.

### Capabilities (PluginCapability)
Declared permissions: `vault:read/write/delete/watch`, `editor:extensions`, `markdown:extensions`, `ui:views/sidebar/statusbar/contextmenu`, `commands`, `hotkeys`, `settings`, `themes`, `bookmarks:read`, `bookmarks:write`, `notifications`.

### ViewDescriptor (type)
Declarative UI tree (JSON-serializable). Plugins describe UI as `ViewNode` trees; the host renders per-platform. Plugins never touch DOM/CSS directly.

### WorkspaceOpenOptions (type)
`api.workspace.openFile(path, options?)` and `api.workspace.openView(viewId, options?)` accept `target: "active" | "left" | "right" | "top" | "bottom"` and `newTab?: boolean`. The default target is the active pane; edge targets create host-managed splits. `newTab` asks the host to create a new instance instead of activating an existing file/view tab.

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
