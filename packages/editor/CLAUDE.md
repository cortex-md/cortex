# CLAUDE.md — @cortex/editor

## Purpose

`@cortex/editor` provides the CodeMirror 6 editor integration for Cortex — extensions, live preview, syntax highlighting, and the React editor component.

## Package Structure

```
packages/editor/
  src/
    EditorView.tsx              # React component wrapping CM6
    extensions.ts               # Base extensions + config reconfiguration
    highlight.ts                # Syntax highlighting using live CSS variables
    languages.ts                # Language support (markdown, JS, Python, etc.)
    ReadingView.tsx             # Read-only rendered markdown view
    SideBySideView.tsx          # Side-by-side editor + preview
    clipboardImage.ts           # Clipboard image paste CM6 extension
    markdownCommands.ts         # All markdown formatting CM6 commands (toggle bold, insert table, etc.)
    markdownKeymap.ts           # CM6 keymap bindings wiring commands to keyboard shortcuts
    markdown.css                # Shared semantic Markdown styles
    livePreview/
      index.ts                  # Composes the unified engine
      model.ts                  # One Lezer block traversal and projection models
      blockState.ts             # Block StateField and source/widget mode
      visibleDecorations.ts     # One indexed viewport ViewPlugin
      metrics.ts                # Deterministic traversal and decoration counters
      inlineTree.ts             # Inline snapshots from existing Lezer nodes
      widgets.ts                # Native block and control widgets
      styles.css                # Live Preview-specific styles
    index.ts
```

## Key Exports

- `EditorView` — React component (props: content, filePath, editorConfig, livePreview, extraExtensions, onChange, onCursorChange, onViewReady)
- `clipboardImageExtension(onImagePaste)` — CM6 extension that intercepts paste events with clipboard images, calls the callback with the Blob and inserts the returned markdown string at cursor
- `baseExtensions(options)` — Creates CM6 extensions array including the markdown keymap
- `reconfigureEditor(view, config)` — Reconfigures editor settings via Compartments
- `reconfigurePluginExtensions(view, extensions)` — Reconfigures plugin-provided CM6 extensions
- `livePreviewExtension()` — Unified Live Preview engine
- `buildHighlightStyle()` — Creates CM6 highlight rules that read live CSS variables
- `markdownKeymapCompartment` — CM6 `Compartment` for the dynamic markdown keymap (reconfigurable at runtime)
- `defaultMarkdownBindings` — Default `FormatBinding[]` array (id, keys, enabled) matching hotkeys defaults
- `defaultMarkdownKeymapExtension()` — Creates the initial compartment extension for use in `baseExtensions()`
- `reconfigureMarkdownKeymap(view, bindings)` — Reconfigures the markdown keymap compartment with new bindings
- `type FormatBinding` — `{ id: string; keys: string; enabled: boolean }`
- Markdown commands: `toggleBold`, `toggleItalic`, `toggleStrikethrough`, `toggleInlineCode`, `toggleBlockquote`, `toggleHeading`, `toggleTaskList`, `toggleUnorderedList`, `toggleOrderedList`, `insertLink`, `insertImage`, `insertCodeBlock`, `insertTable`, `insertCallout`, `duplicateLine`, `copyLine`, `removeParagraphFormatting`

## Typography

CodeMirror reads editor font weight and line height from theme CSS variables (`--editor-font-weight` and `--editor-line-height`). `EditorConfig` should carry editor behavior and font size only; do not reintroduce settings-driven line height overrides.

## Markdown Keyboard Shortcuts (Dynamic / User-Customizable)

Shortcuts are handled **inside CM6** via a `Compartment` (not the global hotkey system). They work when the editor has focus. The keymap is driven by the `@cortex/hotkeys` store and reconfigures reactively when the user changes bindings in Settings.

**Integration in `PaneView.tsx`**: `TabEditor` subscribes to the `Format` category bindings snapshot from `useHotkeysStore`. When any binding changes, `reconfigureMarkdownKeymap` updates the CM6 compartment for that editor view.

Default bindings (user-customizable via Settings → Hotkeys):

| Shortcut | Action | Hotkey ID |
|---|---|---|
| `⌘B` | Toggle **bold** | `format.bold` |
| `⌘I` | Toggle *italic* | `format.italic` |
| `⌘⇧X` | Toggle ~~strikethrough~~ | `format.strikethrough` |
| `` ⌘` `` | Toggle `inline code` | `format.inline-code` |
| `⌘K` | Insert link | `format.link` |
| `⌘⇧K` | Insert image | `format.image` |
| `⌘⌥1/2/3` | Toggle Heading 1/2/3 | `format.heading-1/2/3` |
| `⌘⇧.` | Toggle blockquote | `format.blockquote` |
| `` ⌘⇧` `` | Insert code block | `format.code-block` |
| `⌘L` | Toggle task list / check done | `format.task-list` |
| `⌘⇧L` | Toggle unordered list | `format.unordered-list` |
| `⌘⇧O` | Toggle ordered list | `format.ordered-list` |
| `⌘⇧Y` | Insert table | `format.table` |

## Live Preview Architecture

The editor uses one block `StateField` and one visible-range `ViewPlugin`. Block state owns sorted
indexes by block type; visual updates query those indexes for each visible range instead of filtering
the entire document. Block widgets reveal source whenever the cursor or selection enters them.

`registerInline` and `registerSemantic` use the renderer-owned text transformation engine. Portable
semantic nodes are projected to CodeMirror marks or widgets only for visible lines. Advanced Unified
processors do not run in Live Preview.

## Dependencies

- `@codemirror/*` — CodeMirror 6 packages
- `@lezer/*` — Lezer parser for syntax tree
- `@cortex/renderer` — markdown rendering
