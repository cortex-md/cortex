import type { MarkdownProcessorRegistration, MarkdownSurface } from "./registry"

export interface RendererOptions {
	surface?: MarkdownSurface
	processors?: MarkdownProcessorRegistration[]
}

export interface Renderer {
	render: (markdown: string) => Promise<string>
}
