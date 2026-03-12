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
2. `remarkFrontmatter` — strips YAML `---` front matter before rendering
3. `remark-gfm` — GFM tables, strikethrough, task lists syntax
4. `remark-rehype` — mdast → hast
5. `rehypeWikiLinks` — `[[note]]` / `[[note|label]]` → `<a data-wiki-link="note">`
6. `rehypeTaskList` — adds `data-task-item` and checkbox `<input>` to list items
7. `rehype-highlight` — syntax highlighting via highlight.js (adds `hljs-*` classes)
8. `rehype-stringify` — hast → HTML string

## Plugins

| File | Stage | Purpose |
|------|-------|---------|
| `src/plugins/frontmatter.ts` | remark | Strips YAML front matter node before render |
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

## Key Constraints

- No React, no DOM APIs — pure string in, string out
- Pipeline is created once per `createRenderer()` call and reused
- `allowDangerousHtml: false` in remark-rehype — raw HTML in Markdown is stripped
