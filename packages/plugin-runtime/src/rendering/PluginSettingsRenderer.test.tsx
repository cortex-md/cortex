import type { PluginSettingDefinition } from "cortex-plugin-api"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { PluginSettingsRenderer } from "./PluginSettingsRenderer"
import { type SettingsControlComponents, setSettingsControls } from "./settingsControls"

const settings: PluginSettingDefinition[] = [
	{
		key: "enabled",
		type: "boolean",
		label: "Enable feature",
		description: "Turn on the plugin feature.",
		default: true,
	},
]

function createControls(
	overrides: Partial<SettingsControlComponents> = {},
): SettingsControlComponents {
	return {
		Switch: ({ checked }) => (
			<input aria-label="switch" checked={checked} readOnly type="checkbox" />
		),
		TextInput: ({ value }) => <input readOnly value={value} />,
		NumberInput: ({ value }) => <input readOnly type="number" value={value} />,
		Select: ({ value, options }) => (
			<select value={value} onChange={() => {}}>
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		),
		Slider: ({ value }) => <input readOnly type="range" value={value} />,
		ColorPicker: ({ value }) => <input readOnly type="color" value={value} />,
		Label: ({ children }) => <span>{children}</span>,
		Description: ({ children }) => <p>{children}</p>,
		...overrides,
	}
}

describe("PluginSettingsRenderer", () => {
	it("uses host-provided field and group wrappers when available", () => {
		const onUpdate = vi.fn()
		setSettingsControls(
			createControls({
				Group: ({ children }) => <section data-wrapper="group">{children}</section>,
				Field: ({ label, description, children }) => (
					<div data-wrapper="field">
						<span>{label}</span>
						{description && <small>{description}</small>}
						{children}
					</div>
				),
			}),
		)

		const html = renderToStaticMarkup(
			<PluginSettingsRenderer
				pluginId="plugin"
				settings={settings}
				values={{ enabled: true }}
				onUpdate={onUpdate}
			/>,
		)

		expect(html).toContain('data-wrapper="group"')
		expect(html).toContain('data-wrapper="field"')
		expect(html).toContain("Enable feature")
		expect(html).toContain("Turn on the plugin feature.")
	})

	it("keeps the legacy label and description fallback", () => {
		const onUpdate = vi.fn()
		setSettingsControls(createControls())

		const html = renderToStaticMarkup(
			<PluginSettingsRenderer
				pluginId="plugin"
				settings={settings}
				values={{ enabled: true }}
				onUpdate={onUpdate}
			/>,
		)

		expect(html).toContain("<span>Enable feature</span>")
		expect(html).toContain("<p>Turn on the plugin feature.</p>")
	})
})
