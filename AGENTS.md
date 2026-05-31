# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Cortex** is a modular markdown platform with desktop app and developer tooling. The architecture is a monorepo using bun workspaces, with clear separation between:
- **apps/cli** — Official Cortex CLI (Go) for plugin/theme create, validate, and publish workflows
- **apps/desktop** — The Tauri application entry point
- **packages/** — Reusable modules (ui, core, platform, ipc, theme, editor, settings)

## Packages responsabilities

```
cortex/
├── apps/
│   ├── desktop/                    # App Tauri (shell Rust + frontend React/Vite)
│   │   ├── src-tauri/              # Camada nativa Rust
│   │   │   ├── src/
│   │   │   │   ├── commands/       # Handlers IPC expostos ao frontend via tauri-specta
│   │   │   │   │   ├── vault.rs    # open_vault, close_vault, scan_vault, get_vault_metadata
│   │   │   │   │   ├── fs.rs       # read_file, write_file, delete_file, rename_file, hash_file
│   │   │   │   │   ├── watcher.rs  # start_watching, stop_watching (emite eventos Tauri)
│   │   │   │   │   ├── window.rs   # open_vault_in_new_window, get_window_label
│   │   │   │   │   ├── dialog.rs   # pick_folder, show_confirm_dialog
│   │   │   │   │   ├── shell.rs    # open_in_system_explorer, reveal_file
│   │   │   │   │   ├── registry.rs # update_vault_registry, read_vault_registry, remove_from_vault_registry
│   │   │   │   │   ├── auth.rs     # keychain read/write para tokens e device identity
│   │   │   │   │   └── menu.rs     # macOS native menubar: build_menu, refresh_menu_recents, File > Recents submenu
│   │   │   │   ├── sync/           # Engine de sync — roda em thread Rust separada
│   │   │   │   │   ├── engine.rs   # Loop principal: detecta mudanças, enfileira ops, executa
│   │   │   │   │   ├── uploader.rs # Upload de arquivos via HTTP POST com retry e backoff
│   │   │   │   │   ├── downloader.rs # Download e aplicação de versões remotas
│   │   │   │   │   ├── sse.rs      # Cliente SSE persistente: conecta, reconecta, emite eventos Tauri
│   │   │   │   │   ├── merge.rs    # Three-way merge via diff-match-patch (Markdown) e JSON merge
│   │   │   │   │   ├── conflict.rs # Detecção de conflito via hash triplo (local/remote/ancestor)
│   │   │   │   │   ├── db.rs       # Interface com sync.db (SQLite): leitura e escrita de sync_state
│   │   │   │   │   └── auth.rs     # Refresh de access token, fluxo de device token
│   │   │   │   ├── keychain/       # Abstração cross-platform para keychain do OS
│   │   │   │   │   └── mod.rs      # macOS Keychain, Windows Credential Manager, Linux libsecret
│   │   │   │   ├── protocol/       # Protocolo cortex:// para servir assets do vault ao webview
│   │   │   │   │   └── mod.rs
│   │   │   │   └── main.rs         # Entry point Tauri: registra comandos, plugins, setup inicial
│   │   │   └── Cargo.toml
│   │   └── src/                    # Entrada React — composição dos packages
│   │       ├── main.tsx            # initPlatform(tauriAdapter), monta React app
│   │       └── App.tsx             # Composição de layout, providers, workspace
│   └── mobile/                     # (futuro) React Native — consome packages/core e packages/platform
├── packages/
│   ├── core/                       # Lógica pura: vault, metadata, eventos, Note Cache, índice, utiliza o plataform que sera adaptado para cada sistema.
│   ├── editor/                     # Motor de edição: CodeMirror 6 + extensões Markdown + Live Preview
│   ├── ui/                         # Componentes React compartilhados, design system
│   ├── plugin-api/                 # Contratos públicos que plugins podem importar
│   ├── platform/                   # Abstração de plataforma: adapters para Tauri e RN, definição dos tipos principais do filesystem, dialogs e etc.
│   ├── settings/                   # Engine de configurações, cache em memória, persistência
│   ├── search/                     # MiniSearch: indexação, serialização, queries
│   ├── theme/                      # Engine de temas, variáveis CSS, Theme Token Bridge (CSS→RN)
│   ├── sync-client/                # Estado reativo do sync no frontend: status, conflitos, UI bridge
│   └── ipc/                        # Implementação do pacote plataform para o tauri, utilizando suas dependencias e implementações
├── plugins/                        # Plugins core bundled
│   ├── file-explorer/
│   ├── quick-switcher/
│   └── ...
├── bun.lockb
└── bunfig.toml
```

## Code Conventions


### UI components 
Aways use the components from `@cortex/ui` as needed instead of creating new things or using primitive components from html.

### Simplify
After finishing any task run the /simplify command to clean up any leftover code that has over engineered.

### No Comments
Code is self-documenting through descriptive naming. Function names, variable names, and type names should clearly express intent. Comments are never needed if names are precise.

### Self-Documenting Code Standards
- **Function names**: Use clear, descriptive verbs: `openVault`, `refreshFiles`, `flushActive`
- **Variable names**: Avoid abbreviations; prefer `activeFilePath` over `activeFile` or `path`
- **Type names**: Use PascalCase for interfaces/types: `EditorState`, `FileEntry`, `VaultMetadata`
- **Constants**: UPPER_SNAKE_CASE for compile-time constants, lowercase for module-scoped constants
- **Event handlers**: Prefix with action verb: `handleOpenVault`, `handleResize`, `updateCursor`
- **AGENTS.md**: Aways update the AGENTS.md files from the packages you have made changes, to keep the documentation alive.

### Formatting & Linting
- **Biome** enforces all code style (see `biome.json`)
- **Indentation**: Tabs (not spaces)
- **Line width**: 100 characters
- **Quotes**: Double quotes
- **Semicolons**: Not used (Biome removes them)
- **Import organization**: Automatic via Biome (`organizeImports: "on"`)

Run `bun run check` to lint, format, and organize imports all at once. Use `bun run check:fix` to auto-fix issues.

### Type-First Approach
Always define types/interfaces before implementation. Props interfaces extend HTML attributes for consistency:

```typescript
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary"
  size?: "sm" | "md" | "lg"
  children: ReactNode
}
```

## Building & Development

### Core Commands

```bash
bun install                # Install dependencies
bun run check             # Lint + format + organize imports (all at once)
bun run check:fix         # Auto-fix all issues
bun run typecheck         # TypeScript compilation check across monorepo
bun run tauri dev         # Start Tauri dev server (from apps/desktop/)
```

### Running the App
```bash
cd apps/desktop
bun run tauri dev         # Launch Tauri window with hot reload
bun run tauri build       # Build release binary
```

### Monorepo & Workspaces
- Packages use workspace protocol: `"@cortex/core": "workspace:*"`
- Packages are imported as source TS, not built intermediates
- Vite handles tree-shaking at build time
- Each package has its own `tsconfig.json` and `package.json`

## Project Structure

### packages/

| Package | Purpose | Key Exports |
|---------|---------|------------|
| **ui** | React UI primitives (Button, Input, SidebarNav, etc.) | Component functions, CSS class contracts |
| **core** | Zustand state stores + NoteCache | Stores (vaultStore, editorStore, workspaceStore, uiStore), noteCache |
| **platform** | Abstract platform interface | FileSystem, Dialog, Vault, Storage interfaces + Tauri adapter |
| **ipc** | Typed IPC wrappers over Tauri | invoke() and event wrappers for commands |
| **editor** | CodeMirror 6 setup | EditorView, extensions, syntax highlighting |
| **theme** | CSS theme system | ThemeManager, CSS variable generation, paper/ink themes |
| **settings** | App settings management | SettingsManager, Zod validation, persisted via JSON |

### apps/desktop/

- **src/main.tsx** — React entry, initializes ThemeManager, sets up platform
- **src/App.tsx** — Root component, orchestrates stores and layout
- **src/components/** — Desktop-specific UI (FileSidebar, PaneView, etc.)
- **src/styles.css** — Design system CSS (primitives, layout, components)
- **src-tauri/** — Rust source (commands, Tauri config)

## Architecture Patterns

### State Management: Zustand + Immer
Stores use Zustand with Immer middleware for immutable updates:

```typescript
export const useMyStore = create<MyState>()(
  devtools(
    immer((set, get) => ({
      // initial state
      value: 0,

      // actions mutate within immer
      increment: () => set((s) => {
        s.value++
      }),

      // async can use get()
      asyncAction: async () => {
        const current = get().value
        // ...
      }
    })),
    { name: "myStore" }
  )
)
```

### UI Components: Primitives Only
All components in **packages/ui** are pure primitives:
- Apply CSS class names (never inline styles)
- Extend HTML element attributes (`ButtonHTMLAttributes`, `InputHTMLAttributes`, etc.)
- No business logic, no store dependencies
- Reusable across desktop app and future web landing page

Example (Button.tsx):
```typescript
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "accent" | "danger"
  size?: "sm" | "md" | "lg"
  children: ReactNode
}

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  return (
    <button
      type={type}
      className={`btn btn-${size} btn-${variant} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
```

### Platform Abstraction
Rust commands are abstracted behind `@cortex/platform` interfaces. Desktop code never directly imports from IPC; it uses platform methods:

```typescript
// ✅ DO
const platform = getPlatform()
const files = await platform.vault.scanVault(path)

// ❌ DON'T
import { scanVault } from "@cortex/ipc"
const files = await scanVault(path)
```

The platform adapter (`packages/platform/src/adapters/tauri/`) bridges to actual IPC calls.

### NoteCache: Cache-First File Handling
The `NoteCache` class (in `@cortex/core`) manages editor file state:
- **In-memory cache** of file contents and diffs
- **Auto-save** with 2-second debounce
- **Snapshots** for undo/redo
- **Lifecycle**: `noteCache.openTab()` on file open, `noteCache.closeTab()` on close

UI doesn't directly access files; it reads/writes through noteCache.

### Theme System: Injected CSS Variables
`@cortex/theme` generates concrete CSS variables (no nested var() references):
- `initThemeManager("ink")` called before React render
- Injects `<style data-theme="ink">` with all variables as hex values
- `getComputedStyle(document.body)` returns concrete values for syntax highlighting
- Supports runtime theme switching via `setActiveTheme("paper")`

## Common Development Tasks

### Adding a New UI Component
1. Create in `packages/ui/src/MyComponent.tsx` as a primitive
2. Export from `packages/ui/src/index.ts`
3. Import in app: `import { MyComponent } from "@cortex/ui"`
4. Style via CSS classes in `apps/desktop/src/styles.css`

### Adding a New Store
1. Create in `packages/core/src/stores/myStore.ts`
2. Export from `packages/core/src/index.ts`
3. Use in components: `const { state, action } = useMyStore()`

### Adding a New Rust Command
1. Create in `apps/desktop/src-tauri/src/commands/` (e.g., `mycommand.rs`)
2. Add to `commands` module in `main.rs`
3. Register with `#[tauri::command]`
4. Wrap in `@cortex/ipc` and expose via platform

### Debugging
- **DevTools**: Open with keyboard shortcuts in Tauri
- **Store inspection**: Zustand devtools shows in browser console
- **CSS issues**: Check computed styles for theme variables
- **Type errors**: Run `bun run typecheck` to catch TS issues across monorepo

## Important Implementation Details

### Settings Marketplace
`SettingsModal` owns the Marketplace tab. Community plugin/theme browse buttons should call `useUIStore().openMarketplace(tab)` so Settings opens directly on Marketplace with the requested tab selected. The Marketplace search view should occupy the full Settings content area; selecting a plugin or theme replaces search with the detail view and a back button returns to search.

### Editor Setup
- CodeMirror 6 via `@cortex/editor`
- Syntax highlighting colors resolved from CSS variables at EditorView mount
- Config: `@cortex/editor/src/createEditor.ts`

### Keyboard Shortcuts
- Defined in `apps/desktop/src/App.tsx` and component files
- Use native event handlers (`onKeyDown` checks `event.key`, `event.metaKey`)
- No library (too opinionated for this app)

### Sync Logging Architecture
Sync logs follow a **single-source-of-truth** model — Rust is the authority for engine events, the frontend only logs what it originates:

**Rust (engine.rs → `emit_log` → `sync-log` Tauri event)**:
- State transitions (connecting, live, offline, denied, etc.)
- Initial sync start/complete/fail
- DB errors, VEK errors, reconciliation errors
- File sync operation errors (from process_queue)
- Conflicts detected
- Vault access denied (403)

**Frontend (useSyncLogStore.getState().log() directly)**:
- Sync lifecycle start/stop decisions (useSyncLifecycle.ts)
- Vault access denied handling on JS side (auto-unlink)

**Never duplicate**: If an event originates in Rust, only Rust logs it. The frontend `onSyncLog` listener bridges Rust logs into `syncLogStore`. Frontend code must NOT add its own log call for the same event.

**Never log tokens or secrets**. Server URLs and vault IDs are safe for debugging self-hosted setups.

### File Watching
- Rust `notify` crate emits `vault-file-changed` events
- `vaultStore.refreshFiles()` polls vault on file changes
- Prevents editor from overwriting external changes

### Workspace Persistence
- Tracks open tabs, pane splits, and positions
- Saved to `vault/.cortex/workspace.json` with 500ms debounce
- Restored on vault open via `loadWorkspace()`

## TypeScript Configuration

- **tsconfig.json** (root): References all packages and apps
- **packages/*/tsconfig.json**: Each package has `composite: true` and `declaration: true`
- **Type checking**: `bun run typecheck` runs `tsc -b` (build mode) across all references

## Dependency Management

- **bun workspaces**: Local packages use `workspace:*` protocol
- **No dependency duplication**: Shared deps in root `package.json` when possible
- **Peer dependencies**: UI package declares `react >= 19` as peer

## When Implementing Features

1. **Design the types/interfaces first** — this drives the implementation
2. **No comments** — write self-documenting code
3. **Biome first** — run `bun run check:fix` before committing
4. **Stores for shared state** — don't prop-drill
5. **Platform abstraction** — never call IPC directly from UI
6. **CSS classes for styling** — primitives never use inline styles

## Phases (Implementation Progress)

- **Phase 1**: Monorepo + Tauri shell ✅
- **Phase 2**: Vault ops, FileSystem, Watcher, Dialog ✅
- **Phase 3**: Editor (CodeMirror 6), NoteCache ✅
- **Phase 4**: UI primitives, multi-tab/split-pane layout ✅
- **Phase 5**: Theme system integration ✅
- **Phase 6+**: Settings UI, advanced features (coming)
