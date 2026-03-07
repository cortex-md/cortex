import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { python } from "@codemirror/lang-python"
import { rust } from "@codemirror/lang-rust"
import { sql } from "@codemirror/lang-sql"
import { yaml } from "@codemirror/lang-yaml"
import type { LanguageSupport } from "@codemirror/language"

const languageMap: Record<string, () => LanguageSupport> = {
	javascript: () => javascript(),
	js: () => javascript(),
	typescript: () => javascript({ typescript: true }),
	ts: () => javascript({ typescript: true }),
	jsx: () => javascript({ jsx: true }),
	tsx: () => javascript({ jsx: true, typescript: true }),
	python: () => python(),
	py: () => python(),
	rust: () => rust(),
	rs: () => rust(),
	html: () => html(),
	css: () => css(),
	json: () => json(),
	yaml: () => yaml(),
	yml: () => yaml(),
	sql: () => sql(),
}

export function getLanguageSupport(lang: string): LanguageSupport | null {
	const factory = languageMap[lang.toLowerCase()]
	return factory ? factory() : null
}
