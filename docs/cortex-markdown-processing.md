# Cortex – Markdown Processing & Extension System

---

# 1. Objective

Design and implement a **fully extensible Markdown processing pipeline** that allows plugins to:

* Post-process rendered Markdown
* Process specific code blocks by language
* Extend Markdown syntax
* Manipulate AST before render
* Inject interactive UI components
* Remain secure, performant, and lifecycle-safe

The system must be:

* Deterministic
* Sandboxed
* Transaction-safe
* SSR-compatible (future)
* Collaborative-editing ready
* Async-aware

---

# 2. Rendering Architecture Overview

## 2.1 High-Level Flow

Raw Markdown
↓
Markdown Parser 
↓
AST (Intermediate Representation)
↓
Pre-Render AST Hooks (optional future phase)
↓
HTML Render
↓
MarkdownPostProcessor Phase
↓
DOM Patch Finalization
↓
Mounted in View Layer

---

# 3. Core Concepts

## 3.1 Two Extension Types

### A) Markdown Post Processors

Runs on fully rendered HTML.
Used for:

* Enhancing links
* Decorating quotes
* Highlighting terms
* Image manipulation
* Injecting UI wrappers

### B) Code Block Processors

Runs only for fenced code blocks with a specific language identifier.
Used for:

* Mermaid
* Charts
* Math
* Custom DSL
* Embedded widgets

---

# 4. Plugin API Contracts

---

## 4.1 Markdown Post Processor API

### Registration

```ts
this.registerMarkdownPostProcessor(
  (el: MarkdownElement, ctx: MarkdownPostProcessorContext) => {}
);
```

### Types

```ts
interface MarkdownPostProcessorContext {
  sourcePath: string;
  frontmatter?: Record<string, any>;
  containerEl: HTMLElement;
  getSectionInfo(): MarkdownSectionInfo | null;
}
```

```ts
interface MarkdownSectionInfo {
  lineStart: number;
  lineEnd: number;
}
```

```ts
interface MarkdownElement {
  findAll(selector: string): MarkdownElement[];
  addClass(cls: string): void;
  setText(text: string): void;
  setInnerHTML(html: string): void;
  getText(): string;
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  getNativeElement(): HTMLElement;
  getParent(): MarkdownElement | null;
}
```

### Execution Rules

* Runs after HTML is generated
* Runs per Markdown section (not entire document at once)
* Must not mutate outside provided root element
* Must not directly attach global listeners (must use plugin lifecycle)
* Supports async (returns Promise<void>)

---

## 4.2 Code Block Processor API

### Registration

```ts
this.registerMarkdownCodeBlockProcessor(
  language: string,
  processor: (
    source: string,
    el: MarkdownElement,
    ctx: MarkdownPostProcessorContext
  ) => void | Promise<void>
);
```

### Execution Flow

1. Parser detects fenced code block
2. Language extracted
3. Matching processor resolved
4. Raw source passed to processor
5. Processor replaces content inside container element

---

# 5. Internal Engine Design

---

## 5.1 Parser Layer

* Based on markdown-it
* Extended with:

  * Wiki links
  * Embeds
  * Task lists
  * Frontmatter support

All tokens converted into Cortex AST nodes.

---

## 5.2 AST Model (Internal)

```ts
interface CortexMarkdownNode {
  type: string;
  children?: CortexMarkdownNode[];
  content?: string;
  meta?: Record<string, any>;
  position: {
    start: number;
    end: number;
  };
}
```

Future extension point:

```ts
registerMarkdownAstTransformer(
  (root: CortexMarkdownNode) => CortexMarkdownNode
);
```

Not exposed in v1 but architecture must support it.

---

# 6. Post Processor Lifecycle

For each rendered section:

1. Create isolated root container
2. Attach DOM fragment
3. Execute processors sequentially
4. Await async processors
5. Commit to document

Processor ordering:

* Deterministic order
* Plugin load order
* Optional priority override

Example:

```ts
this.registerMarkdownPostProcessor(fn, { priority: 100 });
```

Default priority: 0
Higher priority runs first.

---

# 7. Performance Constraints

Must ensure:

* Section-based rendering
* No full-document rescans
* No uncontrolled TreeWalker over entire vault
* MutationObserver not allowed inside processors
* Async processors cancellable

Cancellation model:

* If user edits section while async processor running → abort
* AbortController passed internally

---

# 8. Security Model

Plugins must:

* Not inject untrusted HTML without sanitization
* Not override sandbox boundaries
* Not access unrelated DOM nodes

We will:

* Sanitize HTML before final mount
* Provide safe wrapper utilities
* Restrict innerHTML usage unless explicitly allowed

Future:

* Plugin permission manifest
* "dangerous-html" capability flag

---

# 9. Real Use Case Implementation Strategy

---

## 9.1 External Link Decorator

Pattern:

* Select anchor tags
* Add attributes
* Add CSS classes

Constraint:

Must not alter internal wiki links.

---

## 9.2 Custom Block Quotes

Pattern:

* Identify blockquote
* Inspect text prefix
* Add semantic class
* Inject inline icon element

Do not rewrite entire innerHTML.

---

## 9.3 Highlight Search Terms

Rules:

* Only operate within provided section
* Avoid infinite DOM rewriting
* Batch replacements
* Replace nodes after traversal

---

## 9.4 Image Processor

Rules:

* Add loading="lazy"
* Wrap in figure safely
* Preserve original reference
* Avoid double wrapping

Engine must detect already processed elements.

---

# 10. Code Block Processing Strategy

---

## 10.1 Mermaid

Execution:

* Generate unique ID
* Render to SVG
* Replace container content
* Catch and render fallback error

Must support async.
Must handle theme changes.

---

## 10.2 Chart Processor

Execution:

* Parse JSON
* Create canvas
* Instantiate chart
* Store instance reference for cleanup

Cleanup requirement:

On section unmount → destroy Chart instance.

---

# 11. Cleanup & Lifecycle Management

When:

* Plugin unloads
* File changes
* Section re-renders

Engine must:

* Remove processor references
* Dispose external resources
* Remove event listeners
* Destroy third-party instances

Provide API:

```ts
ctx.registerCleanup(() => {
  // cleanup code
});
```

---

# 12. Collaboration & Live Editing Compatibility

Requirements:

* Processors must be idempotent
* Must handle partial re-render
* Must not rely on global state
* Must re-run safely after remote edits

---

# 13. Future Expansion

* AST-level plugins
* Inline Markdown widgets
* Server-side Markdown rendering
* Static export compatibility
* Plugin-defined Markdown containers

---

# 14. Versioning Strategy

* Semantic versioning
* Capability flags
* Deprecation warnings

Example:

```ts
if (this.app.markdownApiVersion >= 2) {
  // use new feature
}
```

---

# 15. Testing Requirements

We must provide:

* Mock Markdown render harness
* Section renderer simulator
* AST snapshot tests
* Performance benchmarks
* Plugin isolation tests

---

# 16. Final Principles

The Markdown Processing system must:

* Be predictable
* Be extensible
* Be secure
* Be performant
* Be editor-synchronized
* Be future-proof

It is a core pillar of Cortex's extensibility model and must be treated as infrastructure, not a utility layer.
