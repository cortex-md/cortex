import type { Disposable, PluginAPI, WorkspaceOpenOptions } from "cortex-plugin-api"

type OpenFileFn = (path: string, options?: WorkspaceOpenOptions) => void
type OpenViewFn = (viewId: string, options?: WorkspaceOpenOptions) => void
type GetOpenFilesFn = () => string[]
type SubscribeActiveFileFn = (callback: (path: string | null) => void) => () => void

let openFileFn: OpenFileFn | null = null
let openViewFn: OpenViewFn | null = null
let getOpenFilesFn: GetOpenFilesFn | null = null
let subscribeActiveFileFn: SubscribeActiveFileFn | null = null

export function setWorkspaceFunctions(fns: {
	openFile: OpenFileFn
	openView: OpenViewFn
	getOpenFiles: GetOpenFilesFn
	subscribeActiveFile: SubscribeActiveFileFn
}): void {
	openFileFn = fns.openFile
	openViewFn = fns.openView
	getOpenFilesFn = fns.getOpenFiles
	subscribeActiveFileFn = fns.subscribeActiveFile
}

export function createWorkspaceAPI(): PluginAPI["workspace"] {
	return {
		openFile(path: string, options?: WorkspaceOpenOptions): void {
			openFileFn?.(path, options)
		},

		openView(viewId: string, options?: WorkspaceOpenOptions): void {
			openViewFn?.(viewId, options)
		},

		getOpenFiles(): string[] {
			return getOpenFilesFn?.() ?? []
		},

		onActiveFileChange(callback: (path: string | null) => void): Disposable {
			if (!subscribeActiveFileFn) return { dispose() {} }
			const unsubscribe = subscribeActiveFileFn(callback)
			return { dispose: unsubscribe }
		},
	}
}
