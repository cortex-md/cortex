# Development Roadmap

Tracks progress from Phase 1 through future development. Maps to `cortex-core.md` spec sections.

---

## Completed Phases

### Phase 1 — Monorepo + Tauri Shell ✅
- Bun workspaces with `workspace:*` protocol
- Tauri v2 with macOS private API (vibrancy, overlay titlebar)
- Package structure: `apps/desktop`, `packages/{ipc,platform,core,editor,theme,settings,ui}`

### Phase 2 — Vault Ops, FileSystem, Watcher, Dialog ✅
- `@cortex/platform` abstraction (FileSystem, Dialog, Vault, Storage interfaces)
- Tauri adapter bridging IPC calls
- File watcher via Rust `notify` crate
- Vault registry (recent vaults, metadata persistence)

### Phase 3 — Editor (CodeMirror 6), NoteCache ✅
- CodeMirror 6 with Compartments for reactive settings
- `NoteCache` with auto-save (2s debounce), snapshots, cache-first reads
- Lezer-based live preview (code blocks, headings, bold, italic, links, etc.)
- `syntaxTree()` used in all live preview plugins (no regex)
- `Cmd+F` find-in-editor via CM6 search extension
- `reconfigureEditor()` with Compartments

### Phase 4 — UI Primitives, Multi-Tab/Split-Pane Layout ✅
- `@cortex/ui` — Button, Input, Toggle, SidebarNav, SplitPaneView, TabBar, StatusBar
- workspaceStore: split panes, tabs, MRU navigation, workspace persistence
- Keyboard shortcuts: Cmd+W close, Cmd+Tab MRU, Cmd+1-9 tab switch

### Phase 5 — Theme System Integration ✅
- `@cortex/theme` — ThemeManager, CSS variable generation, paper/ink themes
- `WebThemeAdapter` abstracts DOM from ThemeManager
- Runtime theme switching via `setActiveTheme()`
- Syntax highlighting colors resolved from CSS variables

### Phase 6 — Settings, Tailwind v4 + shadcn Migration ✅
- `@cortex/settings` — SettingsManager, Zod validation, vault-scoped JSON persistence
- Settings modal with sidebar navigation (General, Appearance, Editor, Hotkeys)
- Tailwind v4 via `@tailwindcss/vite` plugin
- shadcn UI components (Dialog, Sidebar, Breadcrumb, Switch, etc.)
- Dark mode: `@custom-variant dark (&:is(.theme-ink *))` maps shadcn `dark:` to `.theme-ink`
- `cn()` utility at `packages/ui/src/lib/utils.ts`
- Vault creation flow with icon/color pickers

---

## Phase 7 — Core Completion ✅

Fix broken features and wire up settings that exist in schema but don't work.

| Task | Status | Description |
|------|--------|-------------|
| 7A: Colorscheme selector | ✅ | Wire onChange, add system detection via matchMedia |
| 7B: Auto-open last vault | ✅ | Auto-open `recentVaults[0]` on startup, setting toggle |
| 7C: GeneralSettings | ✅ | Replace stub with autoOpenLastVault toggle |
| 7D: Accent color picker | ✅ | Color picker for accentColor, dynamic CSS override |
| 7E: UI font family | ✅ | Font family selector, applied via CSS variable |
| 7F: Custom theme loading | — | Deferred to Phase 12 (plugin system) |

---

## Phase 8 — File Operations & Navigation ✅

| Task | Status | Description |
|------|--------|-------------|
| 8A: File CRUD in sidebar | ✅ | New Note/Folder buttons, inline rename, delete |
| 8B: Context menus | ✅ | Native macOS menus + Radix fallback for file tree + tabs |
| 8C: Quick Finder (Cmd+O) | ✅ | Modal with fuzzy file search via cmdk, recent files, create note |
| 8D: Command Palette (Cmd+P) | ✅ | Command registry with fuzzy filter, shortcut display |

**Spec sections**: File Operations, Navigation

---

## Phase 9 — Search & Discovery ✅

| Task | Status | Description |
|------|--------|-------------|
| 9A: Search package + indexing | ✅ | `@cortex/search` with MiniSearch, preprocessor, vault indexing |
| 9B: Search sidebar UI | ✅ | Search input with debounce, highlighted snippets, tag filter chips |
| 9C: Vault-wide search (Cmd+Shift+F) | ✅ | Hotkey focuses search sidebar, indexed full-text search |
| 9D: Bookmarks system | ✅ | BookmarksStore with `.cortex/bookmarks.json`, sidebar with remove |

**Spec sections**: Search, Bookmarks

---

## Phase 10 — Tags System

| Task | Status | Description |
|------|--------|-------------|
| 10A: TagsStore + in-memory index | ✅ | Extracts from frontmatter YAML + inline `#tags`, builds on vault open |
| 10B: Tag Manager sidebar | ✅ | Browse tags with filter, expandable file lists, active tag filter |
| 10C: Tag Picker (Cmd+T) | ✅ | Quick-add tags to notes via modal |
| 10D: Tag chips in UI | ✅ | Tags in file tree + editor |

**Spec sections**: Tags

---

## Phase 11 — Editor Polish & System UI

| Task | Status | Description |
|------|--------|-------------|
| 11A: Reading View | ✅ | Markdown → styled HTML rendering |
| 11B: Hotkeys customization | ✅ | UI for rebinding shortcuts |
| 11C: macOS Menubar | ✅ | Native Rust menu |
| 11D: Editor font family | ✅ | Separate from UI font (uiFontFamily + editorFontFamily) |

**Spec sections**: Editor Modes, Keyboard Shortcuts, System Integration

---

## Phase 12 — Plugin Foundation

| Task | Status | Description |
|------|--------|-------------|
| 12A: `@cortex/plugin-api` | — | Plugin interface + lifecycle |
| 12B: Plugin Manager | — | Load/unload/configure plugins |
| 12C: Core plugin extraction | — | Extract features as plugins |
| 12D: Custom theme loading | — | `.cortex/themes/*.json` via plugin system |

**Spec sections**: Extensibility

---

## Phase 13+ — Future

| Feature | Description |
|---------|-------------|
| Sync engine | Rust SSE + REST for cross-device sync |
| React Native mobile | Mobile app sharing `@cortex/core`, `@cortex/settings` |
| Export | PDF, HTML export |
| Version history | File revision tracking |
| Backlinks | Bidirectional link graph |
| Daily notes | ✅ Date-based note creation (Cmd+D, Daily/ folder) |
| Templates | Note templates system |
