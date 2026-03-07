# Cortex – Suggestions Spec 

---

## Plugin System – EditorSuggest & Autocomplete API (CodeMirror-based)

### Objective

Implement a **professional-grade plugin extension system** for the editor layer, enabling third-party developers to extend Cortex with contextual suggestions, slash commands, inline completions, mentions, AI-assisted actions, and structural editing tools.

This system must be:

* Strongly typed (TypeScript-first)
* Based on CodeMirror 6
* Lifecycle-aware
* Sandboxed and permission-aware
* Performant (lazy evaluation + incremental updates)
* Fully documented and versioned

---

## Architectural Overview

The Editor Plugin API will expose a high-level abstraction similar to `EditorSuggest<T>` while internally bridging to CodeMirror 6 extensions.

Core layers:

1. **Editor Core (CodeMirror 6)**

   * State
   * Transactions
   * View
   * Decorations
   * Extensions

2. **Cortex Editor Abstraction**

   * Editor wrapper
   * Cursor abstraction
   * File abstraction
   * Transaction helpers

3. **Plugin API Layer**

   * EditorSuggest base class
   * Registration lifecycle
   * Suggestion rendering API
   * Context object
   * Permission & isolation model

---

# EditorSuggest API Specification

## Base Class

```ts
import { EditorSuggest } from '@cortex/api';

abstract class EditorSuggest<T> {
  constructor(app: App);

  abstract onTrigger(
    cursor: EditorPosition,
    editor: Editor,
    file: TFile | null
  ): EditorSuggestTriggerInfo | null;

  abstract getSuggestions(
    context: EditorSuggestContext
  ): T[] | Promise<T[]>;

  renderSuggestion?(value: T, el: HTMLElement): void;

  abstract selectSuggestion(
    value: T,
    evt: MouseEvent | KeyboardEvent
  ): void;
}
```

---

## Trigger Flow

1. User types
2. Editor transaction occurs
3. Suggestion manager checks all registered EditorSuggest instances
4. `onTrigger()` is called
5. If returns `EditorSuggestTriggerInfo`, suggestion session starts
6. `getSuggestions()` executes
7. Suggestion popover renders
8. User selects suggestion
9. `selectSuggestion()` executes
10. Suggestion session terminates

---

## EditorSuggestTriggerInfo

```ts
interface EditorSuggestTriggerInfo {
  start: EditorPosition;
  end: EditorPosition;
  query: string;
}
```

Responsibilities:

* Defines replacement range
* Defines current query string
* Anchors suggestion UI

---

## EditorSuggestContext

```ts
interface EditorSuggestContext {
  editor: Editor;
  file: TFile | null;
  start: EditorPosition;
  end: EditorPosition;
  query: string;
}
```

This context must remain immutable during session.

---

# CodeMirror Integration

Internally, the system will:

* Use ViewPlugin to observe transactions
* Use StateField for active suggestion state
* Use Decorations for inline highlights
* Use Tooltip API for suggestion popover
* Use Compartment to dynamically inject/remove plugin extensions

Performance requirements:

* No full-document scanning
* Trigger evaluation limited to current line
* Async suggestions cancellable
* Debounce support

---

# Slash Command Reference Pattern

Trigger example:

* `/` at start of line or after whitespace
* RegExp-based query detection
* Filter command registry
* Structured transaction dispatch

Best practices:

* Use `editor.dispatch()` exclusively for mutations
* Never mutate DOM directly inside editor content
* Use transaction-based state updates
* Maintain selection correctly after replacement

---

# Plugin Registration API

```ts
export default class MyPlugin extends Plugin {
  async onload() {
    this.registerEditorSuggest(
      new MyEditorSuggest(this.app)
    );
  }
}
```

## registerEditorSuggest()

Responsibilities:

* Attach suggest instance to SuggestManager
* Auto-cleanup on plugin unload
* Isolate instance scope
* Prevent duplicate registration
* Attach priority level
* Register capability requirements

---

# Suggestion Rendering System

The UI system must:

* Render in a portal outside editor DOM
* Be theme-aware
* Support keyboard navigation
* Support mouse interaction
* Handle scrolling reposition
* Close on blur / escape / invalid trigger

Accessibility requirements:

* ARIA roles (listbox, option)
* Keyboard-only navigation
* Screen reader compatibility

---

# Advanced Capabilities

## 1. Async Suggestions

```ts
async getSuggestions(context) {
  return await fetchRemoteSuggestions(context.query);
}
```

Requirements:

* AbortController for cancellation
* Race-condition safe
* Loading indicator support
* Timeout fallback handling

---

## 2. Inline Decorations

Allow plugins to:

* Highlight trigger range
* Add preview decorations
* Inject ghost text suggestions
* Render inline widgets

---

## 3. AI-assisted Suggestions

Future-ready design:

* LLM-based completions
* Context window extraction
* Structured insertions
* Streaming suggestion rendering

---

## 4. Multi-trigger Support

Multiple suggest systems may run simultaneously:

* @mentions
* #tags
* /commands
* [[wikilinks]]

Priority resolution strategy:

* Longest match wins
* Explicit plugin priority override
* Deterministic conflict resolution

---

# Security & Isolation

Plugins must:

* Not access internal editor state directly
* Not mutate document outside dispatch
* Respect file permissions
* Be sandboxed in extension context

Future consideration:

* Worker-based plugin isolation
* Capability-based API exposure
* Permission manifest system

---

# Versioning & Stability

The Plugin API must follow:

* Semantic versioning
* Deprecation warnings
* Backward compatibility layer
* API capability flags
* Feature detection utilities

Example:

```ts
if (this.app.apiVersion >= 2) {
  // use new API
}
```

---

# Testing Strategy

We must provide:

* Mock Editor environment
* Suggest lifecycle test harness
* Transaction simulation utilities
* Performance benchmarks
* Plugin sandbox testing framework

---

# Future Expansion Roadmap

* Global suggestion registry
* Suggestion analytics API
* Telemetry hooks
* Command palette unification
* Collaborative suggestion sync
* Remote plugin marketplace support

---

# Conclusion

The EditorSuggest system is a foundational extension mechanism for Cortex. It enables a professional, scalable ecosystem of plugins while maintaining editor integrity, performance, and long-term maintainability.

This architecture ensures Cortex can evolve into a highly extensible knowledge platform without sacrificing stability or developer ergonomics.
