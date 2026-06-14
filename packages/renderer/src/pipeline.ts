import rehypeHighlight from "rehype-highlight"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import remarkFrontmatterSyntax from "remark-frontmatter"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import type { Plugin } from "unified"
import { unified } from "unified"
import { getCalloutRegistryVersion } from "./callouts"
import { rehypeCallouts } from "./plugins/callouts"
import { remarkStripFrontmatter } from "./plugins/frontmatter"
import { createRehypeSemanticRegistrations } from "./plugins/semanticRegistrations"
import { rehypeTaskList } from "./plugins/taskList"
import { rehypeMarkdownUrlPolicy } from "./plugins/urlPolicy"
import { rehypeWikiLinks } from "./plugins/wikiLinks"
import {
	getMarkdownProcessorEntries,
	getMarkdownRegistryVersion,
	type MarkdownProcessorRegistration,
	type RegisteredMarkdownProcessor,
	reportMarkdownDiagnostic,
	validateMarkdownProcessorRegistration,
} from "./registry"
import type { Renderer, RendererOptions } from "./types"

interface ProcessorHealth {
	failures: number
	slowRuns: number
	disabled: boolean
}

const processorHealth = new WeakMap<MarkdownProcessorRegistration, ProcessorHealth>()
const slowProcessorThresholdMs = 100
const disableThreshold = 3

const markdownSanitizeSchema = {
	...defaultSchema,
	attributes: {
		...defaultSchema.attributes,
		"*": [...(defaultSchema.attributes?.["*"] ?? []), "className"],
	},
	protocols: {
		...defaultSchema.protocols,
		href: ["http", "https", "mailto"],
		src: ["http", "https", "asset", "cortex", "data", "blob"],
	},
}

function getProcessorHealth(registration: MarkdownProcessorRegistration): ProcessorHealth {
	const existing = processorHealth.get(registration)
	if (existing) return existing
	const created = { failures: 0, slowRuns: 0, disabled: false }
	processorHealth.set(registration, created)
	return created
}

function isMarkdownUnifiedNode(value: unknown): value is { type: string } {
	return (
		typeof value === "object" && value !== null && "type" in value && typeof value.type === "string"
	)
}

function createIsolatedProcessor(entry: RegisteredMarkdownProcessor): Plugin {
	return function isolatedProcessor() {
		const registration = entry.registration
		const health = getProcessorHealth(registration)
		const transformer = registration.processor.call(this)
		if (typeof transformer !== "function") return

		return async (tree, file) => {
			if (health.disabled) return tree
			const startedAt = performance.now()
			try {
				const workingTree = structuredClone(tree)
				const transformed = await transformer.call(this, workingTree as never, file as never)
				const durationMs = performance.now() - startedAt
				health.failures = 0
				if (durationMs >= slowProcessorThresholdMs) {
					health.slowRuns++
					reportMarkdownDiagnostic({
						registrationId: registration.id,
						namespace: entry.namespace,
						severity: "warning",
						message: `Markdown processor took ${Math.round(durationMs)}ms`,
						durationMs,
					})
					if (health.slowRuns >= disableThreshold) health.disabled = true
				} else {
					health.slowRuns = 0
				}
				if (transformed === undefined) return workingTree
				if (!isMarkdownUnifiedNode(transformed)) {
					throw new Error("Markdown processor returned an invalid syntax tree")
				}
				return transformed
			} catch (error) {
				health.failures++
				if (health.failures >= disableThreshold) health.disabled = true
				reportMarkdownDiagnostic({
					registrationId: registration.id,
					namespace: entry.namespace,
					severity: "error",
					message: `${error instanceof Error ? error.message : String(error)}${
						health.disabled ? "; disabled for this session" : ""
					}`,
				})
				return tree
			}
		}
	}
}

function applyProcessors(pipeline: unknown, entries: RegisteredMarkdownProcessor[]): void {
	const processor = pipeline as { use(plugin: Plugin): void }
	for (const entry of entries) processor.use(createIsolatedProcessor(entry))
}

function getOptionProcessors(
	processors: readonly MarkdownProcessorRegistration[],
	surface: RendererOptions["surface"],
	phase: MarkdownProcessorRegistration["phase"],
): RegisteredMarkdownProcessor[] {
	return processors
		.map((registration, order) => {
			validateMarkdownProcessorRegistration(registration)
			return { registration, namespace: "renderer-options", order }
		})
		.filter(({ registration }) => registration.phase === phase)
		.filter(({ registration }) => registration.surfaces.includes(surface ?? "reading-view"))
		.sort(
			(left, right) =>
				(right.registration.priority ?? 0) - (left.registration.priority ?? 0) ||
				left.order - right.order,
		)
		.map(({ registration, namespace }) => ({ registration, namespace }))
}

export function createRenderer(options: RendererOptions = {}): Renderer {
	const surface = options.surface ?? "reading-view"
	const processors = options.processors
	const remarkProcessors =
		(processors && getOptionProcessors(processors, surface, "remark")) ??
		getMarkdownProcessorEntries(surface, "remark")
	const rehypeProcessors =
		(processors && getOptionProcessors(processors, surface, "rehype")) ??
		getMarkdownProcessorEntries(surface, "rehype")
	const pipeline = unified().use(remarkParse).use(remarkFrontmatterSyntax).use(remarkGfm)

	applyProcessors(pipeline, remarkProcessors)

	pipeline.use(remarkStripFrontmatter).use(remarkRehype, { allowDangerousHtml: false })

	applyProcessors(pipeline, rehypeProcessors)

	pipeline
		.use(createRehypeSemanticRegistrations(surface))
		.use(rehypeMarkdownUrlPolicy)
		.use(rehypeSanitize, markdownSanitizeSchema)
		.use(rehypeCallouts)
		.use(rehypeWikiLinks)
		.use(rehypeTaskList)
		.use(rehypeHighlight, { detect: true })
		.use(rehypeStringify)

	return {
		render: async (markdown: string) => {
			const result = await pipeline.process(markdown)
			return String(result)
		},
	}
}

let sharedRenderer:
	| {
			version: string
			renderer: Renderer
	  }
	| undefined

export function getSharedRenderer(): Renderer {
	const version = `${getMarkdownRegistryVersion()}:${getCalloutRegistryVersion()}`
	if (sharedRenderer?.version !== version) {
		sharedRenderer = {
			version,
			renderer: createRenderer(),
		}
	}
	return sharedRenderer.renderer
}
