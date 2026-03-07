import type { Theme } from "./types"

export function generateCSSVariables(theme: Theme): Record<string, string> {
	const vars: Record<string, string> = {}
	const t = theme.tokens

	Object.entries(t.primitive.stone).forEach(([key, value]) => {
		vars[`--stone-${key}`] = value
	})

	Object.entries(t.primitive.ink).forEach(([key, value]) => {
		vars[`--ink-${key}`] = value
	})

	Object.entries(t.primitive.amber).forEach(([key, value]) => {
		vars[`--amber-${key}`] = value
	})

	Object.entries(t.primitive.amberDark).forEach(([key, value]) => {
		vars[`--amber-d-${key}`] = value
	})

	Object.entries(t.primitive.red).forEach(([key, value]) => {
		vars[`--red-${key}`] = value
	})

	Object.entries(t.primitive.green).forEach(([key, value]) => {
		vars[`--green-${key}`] = value
	})

	Object.entries(t.primitive.yellow).forEach(([key, value]) => {
		vars[`--yellow-${key}`] = value
	})

	vars["--bg-primary"] = t.semantic.bg.primary
	vars["--bg-secondary"] = t.semantic.bg.secondary
	vars["--bg-tertiary"] = t.semantic.bg.tertiary
	vars["--bg-elevated"] = t.semantic.bg.elevated
	vars["--bg-hover"] = t.semantic.bg.hover
	vars["--bg-active"] = t.semantic.bg.active
	vars["--bg-selected"] = t.semantic.bg.selected
	vars["--bg-code"] = t.semantic.bg.code
	vars["--bg-tag"] = t.semantic.bg.tag

	vars["--text-primary"] = t.semantic.text.primary
	vars["--text-secondary"] = t.semantic.text.secondary
	vars["--text-muted"] = t.semantic.text.muted
	vars["--text-disabled"] = t.semantic.text.disabled
	vars["--text-placeholder"] = t.semantic.text.placeholder
	vars["--text-on-accent"] = t.semantic.text.onAccent

	vars["--accent"] = t.semantic.accent.default
	vars["--accent-hover"] = t.semantic.accent.hover
	vars["--accent-active"] = t.semantic.accent.active
	vars["--accent-subtle"] = t.semantic.accent.subtle
	vars["--accent-border"] = t.semantic.accent.border
	vars["--accent-text"] = t.semantic.accent.text

	vars["--link"] = t.semantic.link.default
	vars["--link-hover"] = t.semantic.link.hover
	vars["--link-broken"] = t.semantic.link.broken

	vars["--border"] = t.semantic.border.default
	vars["--border-subtle"] = t.semantic.border.subtle
	vars["--border-strong"] = t.semantic.border.strong
	vars["--border-focus"] = t.semantic.border.focus

	vars["--syntax-keyword"] = t.semantic.syntax.keyword
	vars["--syntax-string"] = t.semantic.syntax.string
	vars["--syntax-comment"] = t.semantic.syntax.comment
	vars["--syntax-number"] = t.semantic.syntax.number
	vars["--syntax-function"] = t.semantic.syntax.function
	vars["--syntax-type"] = t.semantic.syntax.type
	vars["--syntax-operator"] = t.semantic.syntax.operator
	vars["--syntax-property"] = t.semantic.syntax.property

	vars["--font-ui"] = t.fonts.ui
	vars["--font-editor"] = t.fonts.editor
	vars["--font-mono"] = t.fonts.mono

	vars["--color-error"] = t.status.error
	vars["--error-bg"] = t.status.errorBg
	vars["--color-success"] = t.status.success
	vars["--success-bg"] = t.status.successBg
	vars["--color-warning"] = t.status.warning
	vars["--warning-bg"] = t.status.warningBg

	vars["--btn-primary-bg"] = t.component.btnPrimaryBg
	vars["--btn-primary-text"] = t.component.btnPrimaryText
	vars["--btn-primary-hover"] = t.component.btnPrimaryHover
	vars["--input-bg"] = t.component.inputBg
	vars["--input-border"] = t.component.inputBorder
	vars["--input-focus-ring"] = t.component.inputFocusRing
	vars["--menu-bg"] = t.component.menuBg
	vars["--menu-border"] = t.component.menuBorder
	vars["--menu-shadow"] = t.component.menuShadow
	vars["--menu-hover"] = t.component.menuHover
	vars["--modal-bg"] = t.component.modalBg
	vars["--modal-border"] = t.component.modalBorder
	vars["--modal-shadow"] = t.component.modalShadow
	vars["--tooltip-bg"] = t.component.tooltipBg
	vars["--tooltip-text"] = t.component.tooltipText
	vars["--sidebar-bg"] = t.component.sidebarBg
	vars["--sidebar-border"] = t.component.sidebarBorder
	vars["--tab-bg"] = t.component.tabBg
	vars["--tab-active-bg"] = t.component.tabActiveBg
	vars["--tab-accent"] = t.component.tabAccent
	vars["--statusbar-bg"] = t.component.statusbarBg
	vars["--statusbar-border"] = t.component.statusbarBorder
	vars["--scrollbar-thumb"] = t.component.scrollbarThumb
	vars["--scrollbar-hover"] = t.component.scrollbarHover
	vars["--shadow-raised"] = t.component.shadowRaised
	vars["--shadow-floating"] = t.component.shadowFloating
	vars["--shadow-overlay"] = t.component.shadowOverlay

	return vars
}

export function generateCSSString(theme: Theme): string {
	const vars = generateCSSVariables(theme)
	const selector = theme.isDark ? ".theme-ink" : ".theme-paper"

	const lines = [`${selector} {`]
	Object.entries(vars).forEach(([key, value]) => {
		lines.push(`  ${key}: ${value};`)
	})
	lines.push(`  color-scheme: ${theme.tokens.colorScheme};`)
	lines.push("}")

	return lines.join("\n")
}
