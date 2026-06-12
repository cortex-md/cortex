import type { SettingsControlComponents } from "@cortex/plugin-runtime"
import {
	ColorPicker,
	Input,
	Label,
	NativeSelect,
	NativeSelectOption,
	Slider,
	Switch,
} from "@cortex/ui"
import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { SettingsField } from "./SettingsPrimitives"

function DesktopSwitch({
	checked,
	onCheckedChange,
}: {
	checked: boolean
	onCheckedChange: (value: boolean) => void
}) {
	return <Switch checked={checked} onCheckedChange={onCheckedChange} />
}

function DesktopTextInput({
	value,
	onChange,
	placeholder,
}: {
	value: string
	onChange: (value: string) => void
	placeholder?: string
}) {
	const [local, setLocal] = useState(value)

	useEffect(() => {
		setLocal(value)
	}, [value])

	return (
		<Input
			value={local}
			placeholder={placeholder}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocal(e.target.value)}
			onBlur={() => onChange(local)}
		/>
	)
}

function DesktopNumberInput({
	value,
	onChange,
	min,
	max,
	step,
}: {
	value: number
	onChange: (value: number) => void
	min?: number
	max?: number
	step?: number
}) {
	return (
		<Input
			type="number"
			className="w-24"
			value={value}
			min={min}
			max={max}
			step={step}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(Number(e.target.value))}
		/>
	)
}

function DesktopSelect({
	value,
	onChange,
	options,
}: {
	value: string
	onChange: (value: string) => void
	options: { value: string; label: string }[]
}) {
	return (
		<NativeSelect value={value} onChange={(e) => onChange(e.target.value)}>
			{options.map((opt) => (
				<NativeSelectOption key={opt.value} value={opt.value}>
					{opt.label}
				</NativeSelectOption>
			))}
		</NativeSelect>
	)
}

function DesktopSlider({
	value,
	onChange,
	min,
	max,
	step,
}: {
	value: number
	onChange: (value: number) => void
	min: number
	max: number
	step: number
}) {
	return (
		<div className="flex items-center gap-3">
			<Slider
				className="flex-1"
				value={[value]}
				min={min}
				max={max}
				step={step}
				onValueChange={([v]) => onChange(v)}
			/>
			<span className="text-sm text-muted-foreground w-10 text-right">{value}</span>
		</div>
	)
}

function DesktopColorPicker({
	value,
	onChange,
}: {
	value: string
	onChange: (value: string) => void
}) {
	return <ColorPicker value={value} onChange={(color) => onChange(color ?? value)} />
}

function DesktopLabel({ children }: { children: ReactNode }) {
	return <Label>{children}</Label>
}

function DesktopDescription({ children }: { children: ReactNode }) {
	return <p className="text-xs text-muted-foreground">{children}</p>
}

function DesktopGroup({ children }: { children: ReactNode }) {
	return <div className="flex flex-col gap-3">{children}</div>
}

function DesktopField({
	label,
	description,
	children,
}: {
	label: ReactNode
	description?: ReactNode
	children: ReactNode
}) {
	return (
		<SettingsField label={label} description={description}>
			{children}
		</SettingsField>
	)
}

export const desktopSettingsControls: SettingsControlComponents = {
	Group: DesktopGroup,
	Field: DesktopField,
	Switch: DesktopSwitch,
	TextInput: DesktopTextInput,
	NumberInput: DesktopNumberInput,
	Select: DesktopSelect,
	Slider: DesktopSlider,
	ColorPicker: DesktopColorPicker,
	Label: DesktopLabel,
	Description: DesktopDescription,
}
