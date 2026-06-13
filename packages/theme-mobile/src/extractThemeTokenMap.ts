import postcss, { type Rule } from "postcss"
import type { ExtractThemeTokenMapOptions, ThemeTokenMap } from "./types"

function findClosingParenthesis(value: string, start: number): number {
	let depth = 1
	for (let index = start; index < value.length; index += 1) {
		if (value[index] === "(") depth += 1
		if (value[index] === ")") depth -= 1
		if (depth === 0) return index
	}
	return -1
}

function splitVariableExpression(expression: string): [string, string | undefined] {
	let depth = 0
	for (let index = 0; index < expression.length; index += 1) {
		if (expression[index] === "(") depth += 1
		if (expression[index] === ")") depth -= 1
		if (expression[index] === "," && depth === 0) {
			return [expression.slice(0, index).trim(), expression.slice(index + 1).trim()]
		}
	}
	return [expression.trim(), undefined]
}

function resolveValue(
	value: string,
	resolveToken: (token: string, stack: Set<string>) => string | undefined,
	stack: Set<string>,
): string | undefined {
	let result = ""
	let cursor = 0

	while (cursor < value.length) {
		const variableStart = value.indexOf("var(", cursor)
		if (variableStart === -1) {
			result += value.slice(cursor)
			break
		}

		result += value.slice(cursor, variableStart)
		const variableEnd = findClosingParenthesis(value, variableStart + 4)
		if (variableEnd === -1) return undefined

		const [token, fallback] = splitVariableExpression(value.slice(variableStart + 4, variableEnd))
		const replacement =
			(token.startsWith("--") ? resolveToken(token, stack) : undefined) ??
			(fallback ? resolveValue(fallback, resolveToken, stack) : undefined)
		if (replacement === undefined) return undefined

		result += replacement
		cursor = variableEnd + 1
	}

	return result.trim()
}

function resolveTokens(
	rawTokens: Record<string, string>,
	baseTokens: Record<string, string>,
): Record<string, string> {
	const resolvedTokens: Record<string, string> = {}
	const resolvedBaseTokens = new Map<string, string | undefined>()

	const resolveBaseToken = (token: string, stack: Set<string>): string | undefined => {
		if (resolvedBaseTokens.has(token)) return resolvedBaseTokens.get(token)
		if (stack.has(token)) return undefined

		const rawValue = baseTokens[token]
		if (rawValue === undefined) return undefined

		const nextStack = new Set(stack)
		nextStack.add(token)
		const resolvedValue = resolveValue(rawValue, resolveBaseToken, nextStack)
		resolvedBaseTokens.set(token, resolvedValue)
		return resolvedValue
	}

	const resolveToken = (token: string, stack: Set<string>): string | undefined => {
		if (resolvedTokens[token] !== undefined) return resolvedTokens[token]
		if (stack.has(token)) return resolveBaseToken(token, new Set())

		const rawValue = rawTokens[token]
		if (rawValue === undefined) return undefined

		const nextStack = new Set(stack)
		nextStack.add(token)
		const resolvedValue = resolveValue(rawValue, resolveToken, nextStack)
		if (resolvedValue !== undefined) resolvedTokens[token] = resolvedValue
		return resolvedValue
	}

	for (const token of Object.keys(rawTokens)) {
		resolveToken(token, new Set())
	}

	return resolvedTokens
}

function collectRuleTokens(rule: Rule, target: Record<string, string>): void {
	rule.each((node) => {
		if (node.type === "decl" && node.prop.startsWith("--")) {
			target[node.prop] = node.value.trim()
		}
	})
}

export function extractThemeTokenMap(
	css: string,
	options: ExtractThemeTokenMapOptions,
): ThemeTokenMap {
	const rootTokens: Record<string, string> = {}
	const themeTokens: Record<string, string> = {}
	const selector = options.selector ?? `.theme-${options.theme}-${options.colorScheme}`
	const stylesheet = postcss.parse(css)

	stylesheet.walkRules((rule) => {
		if (rule.selectors.includes(":root")) collectRuleTokens(rule, rootTokens)
		if (rule.selectors.includes(selector)) collectRuleTokens(rule, themeTokens)
	})

	const baseTokens = options.baseTokens ?? {}
	const rawTokens = { ...baseTokens, ...rootTokens, ...themeTokens }

	return {
		theme: options.theme,
		colorScheme: options.colorScheme,
		tokens: resolveTokens(rawTokens, baseTokens),
	}
}
