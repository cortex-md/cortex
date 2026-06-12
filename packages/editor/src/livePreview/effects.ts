import { StateEffect } from "@codemirror/state"

export const livePreviewRegistryChanged = StateEffect.define<void>()
export const toggleCalloutCollapsed = StateEffect.define<string>()
export const hoveredCodeBlockChanged = StateEffect.define<string | null>()
