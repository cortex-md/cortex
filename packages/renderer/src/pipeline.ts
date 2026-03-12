import rehypeHighlight from "rehype-highlight"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"
import { remarkFrontmatter } from "./plugins/frontmatter"
import { rehypeTaskList } from "./plugins/taskList"
import { rehypeWikiLinks } from "./plugins/wikiLinks"
import type { Renderer, RendererOptions } from "./types"

export function createRenderer(options: RendererOptions = {}): Renderer {
	const processor = unified()
		.use(remarkParse)
		.use(remarkFrontmatter)
		.use(remarkGfm)
		.use(remarkRehype, { allowDangerousHtml: false })
		.use(rehypeWikiLinks)
		.use(rehypeTaskList)
		.use(rehypeHighlight, { detect: true })
		.use(rehypeStringify)

	for (const plugin of options.plugins ?? []) {
		for (const remarkPlugin of plugin.remarkPlugins ?? []) {
			if (Array.isArray(remarkPlugin)) {
				processor.use(remarkPlugin[0] as never, ...(remarkPlugin.slice(1) as never[]))
			} else {
				processor.use(remarkPlugin as never)
			}
		}

		for (const rehypePlugin of plugin.rehypePlugins ?? []) {
			if (Array.isArray(rehypePlugin)) {
				processor.use(rehypePlugin[0] as never, ...(rehypePlugin.slice(1) as never[]))
			} else {
				processor.use(rehypePlugin as never)
			}
		}
	}

	return {
		render: async (markdown: string) => {
			const result = await processor.process(markdown)
			return String(result)
		},
	}
}
