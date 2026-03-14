import type { PluginSettingDefinition } from "@cortex/plugin-api"
import { useEffect, useState } from "react"

interface Props {
	pluginId: string
	settings: PluginSettingDefinition[]
	values: Record<string, unknown>
	onUpdate: (key: string, value: unknown) => void
}

export function PluginSettingsRenderer({ settings, values, onUpdate }: Props) {
	return (
		<div className="flex flex-col gap-4">
			{settings.map((setting) => (
				<SettingField
					key={setting.key}
					definition={setting}
					value={values[setting.key] ?? setting.default}
					onChange={(value) => onUpdate(setting.key, value)}
				/>
			))}
		</div>
	)
}

interface SettingFieldProps {
	definition: PluginSettingDefinition
	value: unknown
	onChange: (value: unknown) => void
}

function SettingField({ definition, value, onChange }: SettingFieldProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<span className="text-sm font-medium text-foreground">{definition.label}</span>
			{definition.description && (
				<p className="text-xs text-muted-foreground">{definition.description}</p>
			)}
			<SettingControl definition={definition} value={value} onChange={onChange} />
		</div>
	)
}

function SettingControl({ definition, value, onChange }: SettingFieldProps) {
	switch (definition.type) {
		case "boolean":
			return <BooleanControl checked={value as boolean} onChange={onChange} />
		case "text":
			return (
				<TextControl
					value={value as string}
					onChange={onChange}
					placeholder={definition.placeholder}
				/>
			)
		case "number":
			return (
				<NumberControl
					value={value as number}
					onChange={onChange}
					min={definition.min}
					max={definition.max}
					step={definition.step}
				/>
			)
		case "select":
			return (
				<SelectControl
					value={value as string}
					onChange={onChange}
					options={definition.options ?? []}
				/>
			)
		case "slider":
			return (
				<SliderControl
					value={value as number}
					onChange={onChange}
					min={definition.min ?? 0}
					max={definition.max ?? 100}
					step={definition.step ?? 1}
				/>
			)
		case "color":
			return <ColorControl value={value as string} onChange={onChange} />
		case "folder-path":
			return (
				<TextControl
					value={value as string}
					onChange={onChange}
					placeholder={definition.placeholder ?? "Enter path..."}
				/>
			)
		default:
			return null
	}
}

function BooleanControl({
	checked,
	onChange,
}: {
	checked: boolean
	onChange: (v: unknown) => void
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${checked ? "bg-brand" : "bg-muted"}`}
			onClick={() => onChange(!checked)}
		>
			<span
				className={`pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`}
			/>
		</button>
	)
}

function TextControl({
	value,
	onChange,
	placeholder,
}: {
	value: string
	onChange: (v: unknown) => void
	placeholder?: string
}) {
	const [local, setLocal] = useState(value)

	useEffect(() => {
		setLocal(value)
	}, [value])

	return (
		<input
			type="text"
			className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
			value={local}
			placeholder={placeholder}
			onChange={(e) => setLocal(e.target.value)}
			onBlur={() => onChange(local)}
		/>
	)
}

function NumberControl({
	value,
	onChange,
	min,
	max,
	step,
}: {
	value: number
	onChange: (v: unknown) => void
	min?: number
	max?: number
	step?: number
}) {
	return (
		<input
			type="number"
			className="flex h-9 w-24 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
			value={value}
			min={min}
			max={max}
			step={step}
			onChange={(e) => onChange(Number(e.target.value))}
		/>
	)
}

function SelectControl({
	value,
	onChange,
	options,
}: {
	value: string
	onChange: (v: unknown) => void
	options: { value: string; label: string }[]
}) {
	return (
		<select
			className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		>
			{options.map((opt) => (
				<option key={opt.value} value={opt.value}>
					{opt.label}
				</option>
			))}
		</select>
	)
}

function SliderControl({
	value,
	onChange,
	min,
	max,
	step,
}: {
	value: number
	onChange: (v: unknown) => void
	min: number
	max: number
	step: number
}) {
	return (
		<div className="flex items-center gap-3">
			<input
				type="range"
				className="flex-1"
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
			<span className="text-sm text-muted-foreground w-10 text-right">{value}</span>
		</div>
	)
}

function ColorControl({ value, onChange }: { value: string; onChange: (v: unknown) => void }) {
	return (
		<input
			type="color"
			className="h-9 w-16 cursor-pointer rounded-md border border-input"
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}
