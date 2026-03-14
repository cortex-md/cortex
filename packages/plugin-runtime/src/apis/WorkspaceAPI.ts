import type { Disposable, PluginAPI } from "@cortex/plugin-api"

type OpenFileFn = (path: string) => void
type GetOpenFilesFn = () => string[]
type SubscribeActiveFileFn = (callback: (path: string | null) => void) => () => void

let openFileFn: OpenFileFn | null = null
let getOpenFilesFn: GetOpenFilesFn | null = null
let subscribeActiveFileFn: SubscribeActiveFileFn | null = null

export function setWorkspaceFunctions(fns: {
	openFile: OpenFileFn
	getOpenFiles: GetOpenFilesFn
	subscribeActiveFile: SubscribeActiveFileFn
}): void {
	openFileFn = fns.openFile
	getOpenFilesFn = fns.getOpenFiles
	subscribeActiveFileFn = fns.subscribeActiveFile
}

export function createWorkspaceAPI(): PluginAPI["workspace"] {
	return {
		openFile(path: string): void {
			openFileFn?.(path)
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
