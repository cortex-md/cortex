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

- `EditorView` — React component (props: content, filePath, editorConfig, livePreview, onChange, onCursorChange, onViewReady)
- `baseExtensions(options)` — Creates CM6 extensions array
- `reconfigureEditor(view, config)` — Reconfigures editor settings via Compartments
- `reconfigurePluginExtensions(view, extensions)` — Reconfigures plugin-provided CM6 extensions
- `buildPluginLivePreview(declaration)` — Converts a `LivePreviewDeclaration` into a CM6 Extension (used by plugin-runtime via bridge)
- `livePreviewExtension()` — All built-in live preview plugins composed
- `buildHighlightStyle(tokens)` — Creates CM6 highlight style from CSS variables

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
