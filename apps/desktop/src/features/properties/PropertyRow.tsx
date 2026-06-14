import { getPropertyType } from "@cortex/properties"
import { Button, Popover, PopoverAnchor, PopoverContent } from "@cortex/ui"
import { ChevronRightIcon } from "lucide-react"
import { useState } from "react"
import { PropertyValueEditor } from "./editors/PropertyValueEditor"
import { PropertyColorPicker } from "./inspectors/PropertyColorPicker"
import { PropertyOptionEditor } from "./inspectors/PropertyOptionEditor"
import { PropertySettings } from "./inspectors/PropertySettings"
import { PropertySortPicker } from "./inspectors/PropertySortPicker"
import { PropertyTypePicker } from "./inspectors/PropertyTypePicker"
import { usePropertyInspectorStack } from "./inspectors/usePropertyInspectorStack"
import { PropertyTypeIcon } from "./PropertyTypeIcon"
import { PropertyValueDisplay } from "./PropertyValueDisplay"
import type { PropertyRowProps } from "./types"

export function PropertyRow({
	definition,
	value,
	schema,
	authorConfig,
	onSetValue,
	onRemoveValue,
	onUpdateDefinition,
	onDeleteDefinition,
	onDuplicateDefinition,
}: PropertyRowProps) {
	const [open, setOpen] = useState(false)
	const inspector = usePropertyInspectorStack()
	const propertyType = getPropertyType(definition.type)
	const readOnly = propertyType?.readOnly === true
	const unavailable = !propertyType
	const close = () => setOpen(false)
	const openPanel = (panel: Parameters<typeof inspector.openPanel>[0]) => {
		inspector.openPanel(panel)
		setOpen(true)
	}

	const renderPanel = () => {
		if (inspector.currentPanel.kind === "settings") {
			return (
				<PropertySettings
					definition={definition}
					schema={schema}
					onPush={inspector.pushPanel}
					onUpdateDefinition={onUpdateDefinition}
					onDeleteDefinition={async () => {
						await onDeleteDefinition(definition)
						close()
					}}
					onDuplicateDefinition={async () => {
						await onDuplicateDefinition(definition)
						close()
					}}
				/>
			)
		}
		if (inspector.currentPanel.kind === "types") {
			return (
				<PropertyTypePicker
					definition={definition}
					onBack={inspector.popPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (inspector.currentPanel.kind === "sort") {
			return (
				<PropertySortPicker
					definition={definition}
					onBack={inspector.popPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (inspector.currentPanel.kind === "option") {
			return (
				<PropertyOptionEditor
					definition={definition}
					optionId={inspector.currentPanel.optionId}
					onBack={inspector.popPanel}
					onPush={inspector.pushPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (inspector.currentPanel.kind === "color") {
			return (
				<PropertyColorPicker
					definition={definition}
					optionId={inspector.currentPanel.optionId}
					onBack={inspector.popPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		return (
			<PropertyValueEditor
				definition={definition}
				value={value}
				authorConfig={authorConfig}
				onSetValue={(nextValue) => onSetValue(definition, nextValue)}
				onRemoveValue={() => onRemoveValue(definition)}
				onUpdateDefinition={onUpdateDefinition}
				onClose={close}
			/>
		)
	}

	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen)
				if (!nextOpen) inspector.resetPanels()
			}}
		>
			<div className="note-property-row" data-read-only={readOnly || undefined}>
				<Button
					variant="ghost"
					className="note-property-name"
					disabled={unavailable}
					onClick={(event) => {
						event.stopPropagation()
						openPanel({ kind: "settings" })
					}}
				>
					<PropertyTypeIcon icon={propertyType?.icon ?? "circle-help"} />
					<span>{definition.name}</span>
					<ChevronRightIcon className="note-property-settings-chevron" />
				</Button>
				<PopoverAnchor asChild>
					<Button
						variant="ghost"
						className="note-property-value"
						aria-label={definition.name}
						disabled={readOnly || unavailable}
						onClick={(event) => {
							event.stopPropagation()
							openPanel({ kind: "value" })
						}}
					>
						<PropertyValueDisplay
							definition={definition}
							value={value}
							authorConfig={authorConfig}
						/>
					</Button>
				</PopoverAnchor>
			</div>
			<PopoverContent
				align="start"
				side="bottom"
				sideOffset={4}
				collisionPadding={12}
				className="note-property-popover"
				onEscapeKeyDown={(event) => {
					if (inspector.panelCount <= 1) return
					event.preventDefault()
					inspector.popPanel()
				}}
			>
				{renderPanel()}
			</PopoverContent>
		</Popover>
	)
}
