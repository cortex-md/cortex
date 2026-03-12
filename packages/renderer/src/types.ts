export interface RendererOptions {
	plugins?: RendererPlugin[]
}

export interface RendererPlugin {
	name: string
	remarkPlugins?: UnifiedPlugin[]
	rehypePlugins?: UnifiedPlugin[]
}

export type UnifiedPlugin = [unknown, ...unknown[]] | unknown

export interface Renderer {
	render: (markdown: string) => Promise<string>
}
