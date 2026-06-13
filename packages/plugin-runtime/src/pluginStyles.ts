import {
	type Atrule,
	generate,
	parse,
	type Rule,
	type SelectorList,
	type StyleSheet,
	walk,
} from "css-tree"

const blockedAtRules = new Set(["font-face", "import", "keyframes", "namespace", "page"])
const scopedAtRules = new Set(["container", "layer", "media", "supports"])
const markdownSurfaceSelector = ":where(.markdown-surface)"
const pluginStyleElements = new Map<string, HTMLStyleElement>()

function scopeSelector(selector: string): string {
	const normalized = selector.trim()
	if (
		normalized.startsWith(".markdown-surface") ||
		normalized.startsWith(markdownSurfaceSelector)
	) {
		return normalized
	}
	return `${markdownSurfaceSelector} ${normalized}`
}

export function scopePluginMarkdownStyles(source: string): string {
	const stylesheet = parse(source, { context: "stylesheet" }) as StyleSheet

	walk(stylesheet, {
		visit: "Atrule",
		enter(node: Atrule) {
			const name = node.name.toLowerCase()
			if (blockedAtRules.has(name) || !scopedAtRules.has(name)) {
				throw new Error(`Plugin styles cannot use @${name}`)
			}
		},
	})

	walk(stylesheet, {
		visit: "Rule",
		enter(node: Rule) {
			if (node.prelude.type !== "SelectorList") {
				throw new Error("Plugin styles contain an unsupported selector")
			}
			const selectors = node.prelude.children
				.toArray()
				.map((selector) => scopeSelector(generate(selector)))
			node.prelude = parse(selectors.join(","), { context: "selectorList" }) as SelectorList
		},
	})

	return generate(stylesheet)
}

export function installPluginMarkdownStyles(pluginId: string, css: string | null): void {
	removePluginMarkdownStyles(pluginId)
	if (!css || typeof document === "undefined") return

	const style = document.createElement("style")
	style.dataset.cortexPluginStyle = pluginId
	style.textContent = css
	document.head.appendChild(style)
	pluginStyleElements.set(pluginId, style)
}

export function removePluginMarkdownStyles(pluginId: string): void {
	pluginStyleElements.get(pluginId)?.remove()
	pluginStyleElements.delete(pluginId)
}
