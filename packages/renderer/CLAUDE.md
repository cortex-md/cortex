# CLAUDE.md — @cortex/renderer

Pure TypeScript markdown-to-HTML rendering package. No React, no platform dependencies.

## Purpose

Converts Markdown strings to HTML strings using the unified/remark/rehype pipeline.
Used by `@cortex/editor` for `ReadingView` and `SideBySideView`.

## Public API

```typescript
import { createRenderer } from "@cortex/renderer"

const renderer = createRenderer()
const html = await renderer.render(markdownString)
```

`createRenderer(options?)` builds and caches the unified pipeline. The returned
`Renderer` object is reusable — call `render()` repeatedly.

## Pipeline Order

1. `remark-parse` — Markdown → mdast
2. `remarkFrontmatter` — strips YAML `---` front matter nodes, saves parsed fields to `file.data`
3. `remark-gfm` — GFM tables, strikethrough, task lists syntax
4. `remark-rehype` — mdast → hast
5. `rehypeFrontmatter` — injects a Properties card (hast div) from parsed frontmatter data
6. `rehypeWikiLinks` — `[[note]]` / `[[note|label]]` → `<a data-wiki-link="note">`
7. `rehypeTaskList` — adds `data-task-item` and checkbox `<input>` to list items
8. `rehype-highlight` — syntax highlighting via highlight.js (adds `hljs-*` classes)
9. `rehype-stringify` — hast → HTML string

## Plugins

| File | Stage | Purpose |
|------|-------|---------|
| `src/plugins/frontmatter.ts` (remarkFrontmatter) | remark | Strips YAML front matter nodes, parses fields into `file.data.frontmatterFields` |
| `src/plugins/frontmatter.ts` (rehypeFrontmatter) | rehype | Injects a styled Properties card (div.frontmatter-card) from parsed frontmatter data |
| `src/plugins/wikiLinks.ts` | rehype | Transforms `[[link]]` text into `<a data-wiki-link>` elements |
| `src/plugins/taskList.ts` | rehype | Enhances GFM task list items with `data-task-item` and checkbox inputs |

### Adding a Plugin

1. Create `src/plugins/myPlugin.ts` exporting a unified `Plugin` function
2. Add it to the pipeline in `src/pipeline.ts` at the appropriate stage
3. Or expose it via `RendererPlugin` interface for consumer-provided plugins

## RendererPlugin Interface

```typescript
interface RendererPlugin {
  name: string
  remarkPlugins?: UnifiedPlugin[]
  rehypePlugins?: UnifiedPlugin[]
}

createRenderer({ plugins: [myPlugin] })
```

## CSS Classes

The renderer produces `hljs-*` classes on code blocks. Map these to `--syntax-*`
CSS variables in the consuming app's stylesheet (see `apps/desktop/src/styles.css`
`.reading-view .hljs-*` rules).

Wiki links use `data-wiki-link` attribute — style with `.reading-view a[data-wiki-link]`.
Task list items use `data-task-item="checked|unchecked"`.

Frontmatter Properties card uses these classes (style under `.reading-view`):
- `.frontmatter-card` — outer container (border, background, border-radius)
- `.frontmatter-header` — "Properties" label (uppercase, muted)
- `.frontmatter-fields` — field rows container (flex column)
- `.frontmatter-row` — single key-value row (flex row)
- `.frontmatter-key` — field name (muted text, fixed width)
- `.frontmatter-value` — field value
- `.frontmatter-tag` — tag chip (accent-colored pill)

## Key Constraints

- No React, no DOM APIs — pure string in, string out
- Pipeline is created once per `createRenderer()` call and reused
- `allowDangerousHtml: false` in remark-rehype — raw HTML in Markdown is stripped
