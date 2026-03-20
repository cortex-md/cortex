# CLAUDE.md — @cortex/hotkeys

## Purpose

`@cortex/hotkeys` manages keyboard shortcuts for the Cortex app. All shortcuts are defined here with default bindings that users can customize per-vault. Supports both static (app-defined) and dynamic (plugin-defined) bindings.

## Architecture

- **`types.ts`** — `HotkeyBinding`, `HotkeyOverride`, `ParsedHotkey` types
- **`defaults.ts`** — All default hotkey bindings with IDs, labels, categories, and default keys
- **`parser.ts`** — Parses hotkey strings (e.g. `"mod+n"`) and matches against `KeyboardEvent`s. `"mod"` resolves to ⌘ on macOS, Ctrl elsewhere
- **`hotkeysStore.ts`** — Zustand store managing bindings, user overrides, dynamic bindings, and handler dispatch
- **`useHotkey.ts`** — React hook for components to register a handler for a hotkey ID
- **`useHotkeyListener.ts`** — React hook that attaches the global `keydown` listener

## Key Patterns

### Hotkey String Format
Keys use `+` separated modifiers and key name: `"mod+shift+n"`, `"mod+Tab"`, `"mod+["`.
`"mod"` is platform-adaptive (⌘ on macOS, Ctrl elsewhere).

### Registering Handlers
Components register handlers via `useHotkey(id, handler)`. The store dispatches matching events.

### User Customization
Overrides stored in `vault/.cortex/hotkeys.json` as `Record<id, { keys, enabled? }>`.
Only changed bindings are persisted. Applies to both default and dynamic bindings.

### Dynamic Bindings (Plugin Commands)
Plugins register commands with `defaultHotkey`, which creates dynamic bindings via `addDynamicBinding()`. Dynamic bindings:
- Are tracked separately from default bindings (via `dynamicBindingIds` Set)
- Receive user overrides from `hotkeys.json` like default bindings
- Are preserved across `resetAll()` (only static bindings reset)
- Are cleaned up when the plugin is disabled (`removeDynamicBinding()`)

### Display Format
`formatHotkeyDisplay("mod+shift+n")` → `"⇧⌘N"` (macOS) or `"Ctrl+Shift+N"` (other).

## Dependencies
- `@cortex/platform` — for file I/O (loading/saving overrides)
- `zustand` — store
- `react` — hooks (peer dependency)
