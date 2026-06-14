import {
	type EditorState,
	type Extension,
	StateEffect,
	StateField,
	Transaction,
} from "@codemirror/state"
import { type EditorView, ViewPlugin } from "@codemirror/view"
import type { FrontmatterEditorState, FrontmatterExtensionOptions, PropertyMap } from "./types"

const emptyFrontmatterState: FrontmatterEditorState = {
	meta: {},
	error: null,
}

const setFrontmatterStateEffect = StateEffect.define<FrontmatterEditorState>()

const frontmatterStateField = StateField.define<FrontmatterEditorState>({
	create() {
		return emptyFrontmatterState
	},
	update(value, transaction) {
		for (const effect of transaction.effects) {
			if (effect.is(setFrontmatterStateEffect)) return effect.value
		}
		return value
	},
})

function createInitialState(options: FrontmatterExtensionOptions): FrontmatterEditorState {
	return {
		meta: options.initialMeta ?? {},
		error: options.initialError ?? null,
	}
}

function publishState(state: FrontmatterEditorState, options: FrontmatterExtensionOptions): void {
	if (state.error) {
		options.onError?.(new Error(state.error))
		return
	}
	options.onChange?.(state.meta)
}

export function createFrontmatterExtension(options: FrontmatterExtensionOptions = {}): Extension {
	const initializedField = frontmatterStateField.init(() => createInitialState(options))
	return [
		initializedField,
		ViewPlugin.fromClass(
			class {
				private currentState: FrontmatterEditorState

				constructor(view: EditorView) {
					this.currentState = view.state.field(frontmatterStateField)
					publishState(this.currentState, options)
				}

				update(update: { state: EditorState }) {
					const nextState = update.state.field(frontmatterStateField)
					if (nextState === this.currentState) return
					this.currentState = nextState
					publishState(nextState, options)
				}
			},
		),
	]
}

export function getFrontmatterEditorState(state: EditorState): FrontmatterEditorState {
	return state.field(frontmatterStateField)
}

export function updateFrontmatterEditorState(
	view: EditorView,
	meta: PropertyMap,
	error: string | null = null,
): void {
	view.dispatch({
		effects: setFrontmatterStateEffect.of({ meta, error }),
		annotations: [Transaction.remote.of(true), Transaction.addToHistory.of(false)],
	})
}
