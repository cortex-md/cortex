import { describe, expect, it } from "vitest"
import { createRenderer, getSharedRenderer } from "./pipeline"
import {
	registerMarkdownInline,
	registerMarkdownProcessor,
	registerMarkdownSemantic,
} from "./registry"

describe("callout rendering", () => {
	it("renders static callouts with rich content", async () => {
		const html = await getSharedRenderer().render(
			"> [!warning] **Custom title**\n>\n> Body with *emphasis*.",
		)

		expect(html).toContain('<aside class="markdown-callout"')
		expect(html).toContain('data-callout="warning"')
		expect(html).toContain("<strong>Custom title</strong>")
		expect(html).toContain("<em>emphasis</em>")
	})

	it("renders expanded and collapsed callouts with explicit state", async () => {
		const renderer = getSharedRenderer()
		const expanded = await renderer.render("> [!tip]+\n> Visible")
		const collapsed = await renderer.render("> [!tip]-\n> Hidden")

		expect(expanded).toContain('<details class="markdown-callout is-collapsible"')
		expect(expanded).toContain('data-callout-fold="+"')
		expect(expanded).toContain(" open")
		expect(collapsed).toContain('class="markdown-callout is-collapsible is-collapsed"')
		expect(collapsed).toContain('data-callout-fold="-"')
		expect(collapsed).not.toContain(" open")
	})
})

describe("shared renderer registries", () => {
	it("updates inline registrations reactively and skips code", async () => {
		const dispose = registerMarkdownInline({
			id: "wave",
			pattern: ":wave:",
			replacement: { type: "text", content: "hello" },
		})

		const registered = await getSharedRenderer().render(":wave: `:wave:`")
		expect(registered).toContain("<p>hello <code>:wave:</code></p>")

		dispose()
		const disposed = await getSharedRenderer().render(":wave:")
		expect(disposed).toContain("<p>:wave:</p>")
	})

	it("parses structured YAML arrays for the frontmatter card", async () => {
		const html = await getSharedRenderer().render(`---
title: "A: structured value"
tags:
  - markdown
  - cortex
---

Body`)

		expect(html).toContain("A: structured value")
		expect(html).toContain('<span class="frontmatter-tag">markdown</span>')
		expect(html).toContain('<span class="frontmatter-tag">cortex</span>')
	})

	it("resolves overlapping inline registrations by priority against the source text", async () => {
		const disposeLow = registerMarkdownInline({
			id: "overlap-low",
			pattern: "ab",
			priority: 0,
			replacement: { type: "text", content: "X" },
		})
		const disposeHigh = registerMarkdownInline({
			id: "overlap-high",
			pattern: "a",
			priority: 10,
			replacement: { type: "text", content: "Y" },
		})

		expect(await getSharedRenderer().render("ab")).toContain("<p>Yb</p>")

		disposeHigh()
		disposeLow()
	})

	it("renders portable semantic output and sanitizes its URLs", async () => {
		const dispose = registerMarkdownSemantic({
			id: "semantic-link",
			selector: { type: "text" },
			transform: ({ source }) =>
				source === "unsafe"
					? {
							type: "link",
							href: "javascript:alert(1)",
							children: [{ type: "text", value: "blocked" }],
						}
					: null,
		})

		const html = await getSharedRenderer().render("unsafe")
		expect(html).toContain("<a>blocked</a>")
		expect(html).not.toContain("javascript:")

		dispose()
	})

	it("composes semantic registrations and inline replacements", async () => {
		const disposeInline = registerMarkdownInline({
			id: "semantic-inline",
			pattern: ":wave:",
			replacement: { type: "text", content: "hello" },
		})
		const disposeInner = registerMarkdownSemantic({
			id: "semantic-inner",
			selector: { type: "text" },
			priority: 0,
			transform: ({ source }) => (source === "wrapped" ? { type: "text", value: ":wave:" } : null),
		})
		const disposeOuter = registerMarkdownSemantic({
			id: "semantic-outer",
			selector: { type: "text" },
			priority: 10,
			transform: ({ source }) =>
				source === "compose"
					? {
							type: "span",
							className: "semantic-output",
							children: [{ type: "text", value: "wrapped" }],
						}
					: null,
		})

		expect(await getSharedRenderer().render("compose")).toContain(
			'<span class="semantic-output">hello</span>',
		)

		disposeOuter()
		disposeInner()
		disposeInline()
	})
})

describe("processor isolation and sanitization", () => {
	it("runs processors only on their declared surface and phase", async () => {
		const dispose = registerMarkdownProcessor({
			id: "export-only",
			phase: "rehype",
			surfaces: ["export"],
			processor: () => (tree: unknown) => {
				const root = tree as { children: Array<{ type: string; value: string }> }
				root.children.unshift({ type: "text", value: "export:" })
			},
		})

		expect(await createRenderer({ surface: "reading-view" }).render("body")).not.toContain(
			"export:",
		)
		expect(await createRenderer({ surface: "export" }).render("body")).toContain("export:")

		dispose()
	})

	it("orders processors by priority and isolates failures", async () => {
		const append = (value: string) => () => (tree: unknown) => {
			const root = tree as {
				children: Array<{ children?: Array<{ type: string; value?: string }> }>
			}
			const text = root.children[0]?.children?.[0]
			if (text) text.value = `${text.value ?? ""}${value}`
		}
		const disposeLow = registerMarkdownProcessor({
			id: "processor-low",
			phase: "rehype",
			surfaces: ["reading-view"],
			priority: 0,
			processor: append("L"),
		})
		const disposeFailure = registerMarkdownProcessor({
			id: "processor-failure",
			phase: "rehype",
			surfaces: ["reading-view"],
			priority: 5,
			processor: () => () => {
				throw new Error("processor failed")
			},
		})
		const disposeHigh = registerMarkdownProcessor({
			id: "processor-high",
			phase: "rehype",
			surfaces: ["reading-view"],
			priority: 10,
			processor: append("H"),
		})

		expect(await createRenderer().render("body")).toContain("<p>bodyHL</p>")

		disposeHigh()
		disposeFailure()
		disposeLow()
	})

	it("sanitizes dangerous Markdown and processor output", async () => {
		const dispose = registerMarkdownProcessor({
			id: "unsafe-output",
			phase: "rehype",
			surfaces: ["reading-view"],
			processor: () => (tree: unknown) => {
				const root = tree as { children: unknown[] }
				root.children.unshift(
					{
						type: "element",
						tagName: "script",
						properties: {},
						children: [{ type: "text", value: "alert(1)" }],
					},
					{
						type: "element",
						tagName: "a",
						properties: { href: "javascript:alert(1)", onclick: "alert(1)" },
						children: [{ type: "text", value: "unsafe" }],
					},
					{
						type: "element",
						tagName: "img",
						properties: { src: "data:text/html;base64,PHNjcmlwdD4=" },
						children: [],
					},
				)
			},
		})

		const html = await createRenderer().render("[link](javascript:alert(1))")
		expect(html).not.toContain("<script")
		expect(html).not.toContain("javascript:")
		expect(html).not.toContain("onclick")
		expect(html).not.toContain("data:text/html")

		dispose()
	})
})
