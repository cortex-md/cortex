import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { tags } from "@lezer/highlight"

export interface SyntaxTokens {
	keyword: string
	string: string
	comment: string
	number: string
	function: string
	type: string
	operator: string
	property: string
	link: string
	textPrimary: string
	textMuted: string
	accent: string
	fontMono: string
}

function resolveValue(value: string, style: CSSStyleDeclaration, depth = 0): string {
	if (depth > 10) return value
	if (!value) return value
	const varMatch = value.match(/var\(--([^,)]+)\)/)
	if (!varMatch) return value
	const varName = varMatch[1]
	const resolvedValue = style.getPropertyValue(`--${varName}`).trim()
	if (!resolvedValue) return value
	return resolveValue(resolvedValue, style, depth + 1)
}

export function resolveSyntaxTokens(element?: Element): SyntaxTokens {
	const resolveFrom = element || document.body
	const style = getComputedStyle(resolveFrom)

	const get = (name: string): string => {
		const raw = style.getPropertyValue(name).trim()
		return resolveValue(raw, style)
	}

	const tokens = {
		keyword: get("--syntax-keyword"),
		string: get("--syntax-string"),
		comment: get("--syntax-comment"),
		number: get("--syntax-number"),
		function: get("--syntax-function"),
		type: get("--syntax-type"),
		operator: get("--syntax-operator"),
		property: get("--syntax-property"),
		link: get("--link"),
		textPrimary: get("--text-primary"),
		textMuted: get("--text-muted"),
		accent: get("--accent"),
		fontMono: get("--font-mono"),
	}

	return tokens
}

export function buildHighlightStyle(t: SyntaxTokens) {
	return syntaxHighlighting(
		HighlightStyle.define([
			{ tag: tags.heading1, fontWeight: "700", fontSize: "1.6em", color: t.textPrimary },
			{ tag: tags.heading2, fontWeight: "700", fontSize: "1.4em", color: t.textPrimary },
			{ tag: tags.heading3, fontWeight: "700", fontSize: "1.2em", color: t.textPrimary },
			{ tag: tags.heading4, fontWeight: "600", fontSize: "1.1em", color: t.textPrimary },
			{ tag: tags.heading5, fontWeight: "600", color: t.textPrimary },
			{ tag: tags.heading6, fontWeight: "600", color: t.textPrimary },
			{ tag: tags.strong, fontWeight: "700" },
			{ tag: tags.emphasis, fontStyle: "italic" },
			{ tag: tags.strikethrough, textDecoration: "line-through" },
			{ tag: tags.link, color: t.link, textDecoration: "underline" },
			{ tag: tags.url, color: t.textMuted },
			{ tag: tags.quote, color: t.textMuted, fontStyle: "italic" },
			{ tag: tags.monospace, fontFamily: t.fontMono, fontSize: "0.9em" },
			{ tag: tags.comment, color: t.comment, fontStyle: "italic" },
			{ tag: tags.keyword, color: t.keyword, fontWeight: "600" },
			{ tag: tags.string, color: t.string },
			{ tag: tags.number, color: t.number },
			{ tag: tags.bool, color: t.keyword },
			{ tag: tags.null, color: t.keyword },
			{ tag: tags.function(tags.variableName), color: t.function },
			{ tag: tags.definition(tags.variableName), color: t.textPrimary },
			{ tag: tags.variableName, color: t.textPrimary },
			{ tag: tags.typeName, color: t.type },
			{ tag: tags.className, color: t.type },
			{ tag: tags.operator, color: t.operator },
			{ tag: tags.punctuation, color: t.textMuted },
			{ tag: tags.bracket, color: t.textMuted },
			{ tag: tags.propertyName, color: t.property },
			{ tag: tags.attributeName, color: t.property },
			{ tag: tags.tagName, color: t.keyword },
		]),
	)
}
