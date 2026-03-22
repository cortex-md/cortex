# CLAUDE.md — @cortex/editor

## Purpose

`@cortex/editor` provides the CodeMirror 6 editor integration for Cortex — extensions, live preview, syntax highlighting, and the React editor component.

## Package Structure

```
packages/editor/
  src/
    EditorView.tsx              # React component wrapping CM6
    extensions.ts               # Base extensions + config reconfiguration
    highlight.ts                # Syntax highlighting from CSS variables
    languages.ts                # Language support (markdown, JS, Python, etc.)
    ReadingView.tsx             # Read-only rendered markdown view
    SideBySideView.tsx          # Side-by-side editor + preview
    clipboardImage.ts           # Clipboard image paste CM6 extension
    markdownCommands.ts         # All markdown formatting CM6 commands (toggle bold, insert table, etc.)
    markdownKeymap.ts           # CM6 keymap bindings wiring commands to keyboard shortcuts
    livePreview/
      index.ts                  # Composes all live preview plugins
      utils.ts                  # isCursorInRange, isCursorOnLine helpers
      formatting.ts             # Bold, italic, strikethrough decorations
      headings.ts               # Heading level decorations
      links.ts                  # Markdown + wiki link decorations
      codeBlock.ts              # Fenced code block + language badge + copy button
      checkboxes.ts             # Task list checkbox widgets
      inlineCode.ts             # Backtick hiding + monospace styling
      blockquote.ts             # Blockquote marker hiding
      frontmatter.ts            # YAML frontmatter card widget
      pluginLivePreviewBuilder.ts  # Converts LivePreviewDeclaration → CM6 Extension
      styles.css                # Live preview CSS styles
    index.ts
```

## Key Exports

- `EditorView` — React component (props: content, filePath, editorConfig, livePreview, extraExtensions, onChange, onCursorChange, onViewReady)
- `clipboardImageExtension(onImagePaste)` — CM6 extension that intercepts paste events with clipboard images, calls the callback with the Blob and inserts the returned markdown string at cursor
- `baseExtensions(options)` — Creates CM6 extensions array including the markdown keymap
- `reconfigureEditor(view, config)` — Reconfigures editor settings via Compartments
- `reconfigurePluginExtensions(view, extensions)` — Reconfigures plugin-provided CM6 extensions
- `buildPluginLivePreview(declaration)` — Converts a `LivePreviewDeclaration` into a CM6 Extension (used by plugin-runtime via bridge)
- `livePreviewExtension()` — All built-in live preview plugins composed
- `buildHighlightStyle(tokens)` — Creates CM6 highlight style from CSS variables
- `markdownKeymapBindings` — Raw `KeyBinding[]` array for markdown shortcuts (included in baseExtensions)
- Markdown commands: `toggleBold`, `toggleItalic`, `toggleStrikethrough`, `toggleInlineCode`, `toggleBlockquote`, `toggleHeading`, `toggleTaskList`, `toggleUnorderedList`, `toggleOrderedList`, `insertLink`, `insertImage`, `insertCodeBlock`, `insertTable`, `insertCallout`, `duplicateLine`, `copyLine`, `removeParagraphFormatting`

## Markdown Keyboard Shortcuts

All shortcuts are handled inside CM6 (not the global hotkey system). They work when the editor has focus:

| Shortcut | Action |
|---|---|
| `⌘B` | Toggle **bold** |
| `⌘I` | Toggle *italic* |
| `⌘⇧X` | Toggle ~~strikethrough~~ |
| `` ⌘` `` | Toggle `inline code` |
| `⌘K` | Insert link |
| `⌘⇧K` | Insert image |
| `⌘⌥1/2/3` | Toggle Heading 1/2/3 |
| `⌘⇧.` | Toggle blockquote |
| `` ⌘⇧` `` | Insert code block |
| `⌘L` | Toggle task list / check done |
| `⌘⇧L` | Toggle unordered list |
| `⌘⇧O` | Toggle ordered list |
| `⌘⇧Y` | Insert table |

## Plugin Live Preview Builder

`pluginLivePreviewBuilder.ts` enables plugins to create live preview decorations declaratively:
- Receives `LivePreviewDeclaration` from `cortex-plugin-api`
- Compiles `inlineRules` (regex patterns) into CM6 ViewPlugins
- Supports three replacement types: `text`, `widget` (DOM element from descriptor), `mark` (CSS class)
- Handles cursor-awareness automatically (hides decorations when cursor overlaps)
- Reuses `isCursorInRange` from existing live preview utils

## Dependencies

- `@codemirror/*` — CodeMirror 6 packages
- `@lezer/*` — Lezer parser for syntax tree
- `@cortex/core` — stores
- `@cortex/renderer` — markdown rendering
- `cortex-plugin-api` (devDependency) — types for LivePreviewDeclaration
