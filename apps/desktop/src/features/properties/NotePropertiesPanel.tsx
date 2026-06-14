import { noteCache, useVaultStore } from "@cortex/core"
import {
	changePropertyType,
	createPropertyKey,
	duplicatePropertyDefinition,
	getNotePropertiesExpanded,
	getObservedPropertyDefinitions,
	getPropertyType,
	getPropertyTypes,
	getResolvedPropertyMap,
	getSortedPropertyOptions,
	getVaultSchema,
	onVaultSchemaChange,
	PROPERTY_COLORS,
	type PrimitivePropertyType,
	type PropertyColor,
	type PropertyDefinition,
	type PropertyMap,
	type PropertyOption,
	type ResolvedAuthorConfig,
	type ResolvedPropertyActor,
	removeProperty,
	resolveAuthorProperty,
	setNotePropertiesExpanded,
	setProperty,
	suggestProperties,
	updateVaultSchema,
	type VaultSchema,
} from "@cortex/properties"
import {
	Avatar,
	AvatarFallback,
	Button,
	Calendar,
	Checkbox,
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	Input,
	Popover,
	PopoverAnchor,
	PopoverContent,
	Separator,
	Switch,
} from "@cortex/ui"
import {
	ArrowDownAZIcon,
	CheckIcon,
	CheckSquare2Icon,
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CopyIcon,
	PlusIcon,
	SearchIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useState } from "react"
import { PropertyTypeIcon } from "./PropertyTypeIcon"

interface NotePropertiesPanelProps {
	filePath: string
}

interface PropertyRowProps {
	definition: PropertyDefinition
	value: unknown
	schema: VaultSchema
	authorConfig: ResolvedAuthorConfig
	onSetValue: (definition: PropertyDefinition, value: unknown) => Promise<void>
	onRemoveValue: (definition: PropertyDefinition) => Promise<void>
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
	onDeleteDefinition: (definition: PropertyDefinition) => Promise<void>
	onDuplicateDefinition: (definition: PropertyDefinition) => Promise<void>
}

interface PropertyValueEditorProps {
	definition: PropertyDefinition
	value: unknown
	authorConfig: ResolvedAuthorConfig
	onSetValue: (value: unknown) => Promise<void>
	onRemoveValue: () => Promise<void>
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
	onClose: () => void
}

interface PropertySettingsProps {
	definition: PropertyDefinition
	schema: VaultSchema
	onPush: (panel: PropertyPanel) => void
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
	onDeleteDefinition: () => Promise<void>
	onDuplicateDefinition: () => Promise<void>
}

interface PropertyTypePickerProps {
	definition: PropertyDefinition
	onBack: () => void
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
}

interface PropertySortPickerProps {
	definition: PropertyDefinition
	onBack: () => void
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
}

interface PropertyOptionEditorProps {
	definition: PropertyDefinition
	optionId: string
	onBack: () => void
	onPush: (panel: PropertyPanel) => void
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
}

interface PropertyColorPickerProps {
	definition: PropertyDefinition
	optionId: string
	onBack: () => void
	onUpdateDefinition: (definition: PropertyDefinition) => Promise<void>
}

interface AddPropertyPopoverProps {
	vaultPath: string
	schema: VaultSchema
	observedProperties: PropertyDefinition[]
	onRegister: (definition: PropertyDefinition) => Promise<void>
}

type PropertyPanel =
	| { kind: "value" }
	| { kind: "settings" }
	| { kind: "types" }
	| { kind: "sort" }
	| { kind: "option"; optionId: string }
	| { kind: "color"; optionId: string }

const optionColorLabels: Record<PropertyColor, string> = {
	gray: "Gray",
	blue: "Blue",
	green: "Green",
	red: "Red",
	amber: "Amber",
	purple: "Purple",
	pink: "Pink",
	teal: "Teal",
}

function isEmptyValue(value: unknown): boolean {
	return value === undefined || value === null || value === ""
}

function isOptionBased(baseType: PrimitivePropertyType | undefined): boolean {
	return baseType === "select"
}

function getOption(definition: PropertyDefinition, value: unknown): PropertyOption {
	return (
		definition.options?.find((option) => option.id === value) ?? {
			id: String(value ?? ""),
			label: "Unknown",
			color: "gray",
		}
	)
}

function getInitials(label: string): string {
	return label
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toLocaleUpperCase())
		.join("")
}

function parseDate(value: unknown): Date | undefined {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined
	const [year, month, day] = value.split("-").map(Number)
	const date = new Date(year, month - 1, day)
	return Number.isNaN(date.getTime()) ? undefined : date
}

function serializeDate(value: Date): string {
	const year = value.getFullYear()
	const month = String(value.getMonth() + 1).padStart(2, "0")
	const day = String(value.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function formatDate(value: unknown): string {
	const date = parseDate(value)
	return date
		? new Intl.DateTimeFormat(undefined, {
				month: "short",
				day: "numeric",
				year: "numeric",
			}).format(date)
		: String(value ?? "")
}

function getValueInputType(baseType: PrimitivePropertyType): string {
	if (baseType === "number") return "number"
	if (baseType === "email") return "email"
	if (baseType === "url") return "url"
	if (baseType === "phone") return "tel"
	return "text"
}

function normalizeInputValue(baseType: PrimitivePropertyType, value: string): unknown {
	if (value === "") return ""
	return baseType === "number" ? Number(value) : value
}

function PropertyOptionValue({
	option,
	onRemove,
}: {
	option: PropertyOption
	onRemove?: () => void
}) {
	return (
		<span className="note-property-option-value" data-color={option.color}>
			<span className="note-property-color-dot" data-color={option.color} />
			<span>{option.label}</span>
			{onRemove && (
				<Button
					variant="ghost"
					size="icon-xs"
					className="note-property-option-remove"
					aria-label={`Remove ${option.label}`}
					onClick={(event) => {
						event.stopPropagation()
						onRemove()
					}}
				>
					<XIcon />
				</Button>
			)}
		</span>
	)
}

function isResolvedActor(value: unknown): value is ResolvedPropertyActor {
	return (
		typeof value === "object" &&
		value !== null &&
		"kind" in value &&
		typeof (value as ResolvedPropertyActor).kind === "string"
	)
}

function ActorValue({ actor }: { actor: ResolvedPropertyActor }) {
	const detail =
		actor.kind === "person"
			? actor.current
				? "You"
				: actor.email
			: actor.kind === "device" && actor.current
				? "This device"
				: undefined
	return (
		<span className="note-property-person-value">
			<Avatar size="sm">
				<AvatarFallback>{getInitials(actor.label)}</AvatarFallback>
			</Avatar>
			<span className="note-property-identity-copy">
				<span>{actor.label}</span>
				{detail && <small>{detail}</small>}
			</span>
		</span>
	)
}

function PropertyValueDisplay({
	definition,
	value,
	authorConfig,
}: {
	definition: PropertyDefinition
	value: unknown
	authorConfig: ResolvedAuthorConfig
}) {
	const propertyType = getPropertyType(definition.type)
	if (isEmptyValue(value)) return <span className="note-property-empty">Empty</span>
	if (!propertyType) {
		return (
			<span className="note-property-unavailable">
				{String(value)}
				<small>Type unavailable</small>
			</span>
		)
	}
	if (isOptionBased(propertyType.baseType)) {
		return <PropertyOptionValue option={getOption(definition, value)} />
	}
	if (isResolvedActor(value)) return <ActorValue actor={value} />
	const personBased = propertyType.baseType === "person" || definition.key === "author"
	if (personBased && authorConfig.variant === "person" && typeof value === "string") {
		const person = authorConfig.options.find((option) => option.id === value)
		if (person) {
			return (
				<span className="note-property-person-value">
					<Avatar size="sm">
						<AvatarFallback>{getInitials(person.label)}</AvatarFallback>
					</Avatar>
					{person.label}
				</span>
			)
		}
	}
	if (propertyType.baseType === "checkbox") {
		return value === true ? (
			<span className="note-property-checkbox-value">
				<CheckSquare2Icon className="note-property-checkbox-icon" />
				Checked
			</span>
		) : (
			<span className="note-property-empty">Unchecked</span>
		)
	}
	if (propertyType.baseType === "date") {
		if (definition.type === "created_time" || definition.type === "last_edited_time") {
			const date = new Date(String(value))
			return (
				<span>
					{Number.isNaN(date.getTime())
						? String(value)
						: new Intl.DateTimeFormat(undefined, {
								dateStyle: "medium",
								timeStyle: "short",
							}).format(date)}
				</span>
			)
		}
		return <span>{formatDate(value)}</span>
	}
	return <span className="note-property-text-value">{String(value)}</span>
}

function TextValueEditor({
	definition,
	value,
	onSetValue,
	onRemoveValue,
	onClose,
}: Omit<PropertyValueEditorProps, "authorConfig" | "onUpdateDefinition">) {
	const propertyType = getPropertyType(definition.type)
	const baseType = propertyType?.baseType ?? "text"
	const [draft, setDraft] = useState(isEmptyValue(value) ? "" : String(value))
	const [error, setError] = useState<string | null>(null)

	const commit = async () => {
		const nextValue = normalizeInputValue(baseType, draft.trim())
		if (isEmptyValue(nextValue)) {
			await onRemoveValue()
			setError(null)
			return true
		}
		const validation = propertyType?.validate(nextValue)
		if (validation && !validation.valid) {
			setError(validation.message ?? "Invalid value")
			return false
		}
		await onSetValue(nextValue)
		setError(null)
		return true
	}

	return (
		<div className="note-property-editor">
			<Input
				autoFocus
				type={getValueInputType(baseType)}
				value={draft}
				aria-label={definition.name}
				aria-invalid={Boolean(error)}
				placeholder={`Enter ${definition.name.toLocaleLowerCase()}`}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => void commit()}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault()
						void commit().then((valid) => {
							if (valid) onClose()
						})
					}
					if (event.key === "Escape") {
						event.preventDefault()
						onClose()
					}
				}}
			/>
			{error && <output className="note-properties-error">{error}</output>}
			{!isEmptyValue(value) && (
				<Button
					variant="ghost"
					size="xs"
					className="note-property-clear"
					onClick={() => {
						void onRemoveValue().then(onClose)
					}}
				>
					Clear
				</Button>
			)}
		</div>
	)
}

function OptionValueEditor({
	definition,
	value,
	onSetValue,
	onRemoveValue,
	onUpdateDefinition,
	onClose,
}: Omit<PropertyValueEditorProps, "authorConfig">) {
	const [query, setQuery] = useState("")
	const options = getSortedPropertyOptions(definition)
	const filteredOptions = options.filter((option) =>
		option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
	)
	const selected = isEmptyValue(value) ? undefined : getOption(definition, value)
	const exactMatch = options.some(
		(option) => option.label.toLocaleLowerCase() === query.trim().toLocaleLowerCase(),
	)

	const createOption = async () => {
		const label = query.trim()
		if (!label || exactMatch) return
		const option: PropertyOption = {
			id: crypto.randomUUID(),
			label,
			color: PROPERTY_COLORS[(definition.options?.length ?? 0) % PROPERTY_COLORS.length],
		}
		await onUpdateDefinition({
			...definition,
			options: [...(definition.options ?? []), option],
			optionSort: definition.optionSort ?? "manual",
		})
		await onSetValue(option.id)
		onClose()
	}

	return (
		<Command shouldFilter={false} className="note-property-command">
			{selected && (
				<div className="note-property-selected-value">
					<PropertyOptionValue
						option={selected}
						onRemove={() => {
							void onRemoveValue()
						}}
					/>
				</div>
			)}
			<CommandInput
				autoFocus
				placeholder="Select an option or create one"
				value={query}
				onValueChange={setQuery}
			/>
			<CommandList>
				<CommandGroup heading="Select an option or create one">
					{filteredOptions.map((option) => (
						<CommandItem
							key={option.id}
							value={option.label}
							onSelect={() => {
								void onSetValue(option.id).then(onClose)
							}}
						>
							<PropertyOptionValue option={option} />
							{option.id === value && <CheckIcon className="ml-auto" />}
						</CommandItem>
					))}
					{query.trim() && !exactMatch && (
						<CommandItem value={`create ${query}`} onSelect={() => void createOption()}>
							<PlusIcon />
							Create “{query.trim()}”
						</CommandItem>
					)}
				</CommandGroup>
				<CommandEmpty>No options found</CommandEmpty>
			</CommandList>
		</Command>
	)
}

function DateValueEditor({
	definition,
	value,
	onSetValue,
	onRemoveValue,
	onClose,
}: Omit<PropertyValueEditorProps, "authorConfig" | "onUpdateDefinition">) {
	const selected = parseDate(value)
	const [draft, setDraft] = useState(selected ? formatDate(value) : "")
	const [month, setMonth] = useState(selected ?? new Date())
	const [error, setError] = useState<string | null>(null)

	const commitDraft = async () => {
		if (!draft.trim()) {
			await onRemoveValue()
			setError(null)
			return true
		}
		const parsed = new Date(draft)
		if (Number.isNaN(parsed.getTime())) {
			setError("Enter a valid date")
			return false
		}
		await onSetValue(serializeDate(parsed))
		setError(null)
		return true
	}

	return (
		<div className="note-property-date-editor">
			<Input
				autoFocus
				value={draft}
				aria-label={definition.name}
				aria-invalid={Boolean(error)}
				placeholder="Jun 18, 2026"
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => void commitDraft()}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault()
						void commitDraft().then((valid) => {
							if (valid) onClose()
						})
					}
					if (event.key === "Escape") onClose()
				}}
			/>
			{error && <output className="note-properties-error">{error}</output>}
			<div className="note-property-calendar-header">
				<strong>
					{new Intl.DateTimeFormat(undefined, { month: "short", year: "numeric" }).format(month)}
				</strong>
				<Button
					variant="ghost"
					size="xs"
					onClick={() => {
						const today = new Date()
						setMonth(today)
						setDraft(formatDate(serializeDate(today)))
						void onSetValue(serializeDate(today))
					}}
				>
					Today
				</Button>
			</div>
			<Calendar
				mode="single"
				month={month}
				selected={selected}
				weekStartsOn={1}
				onMonthChange={setMonth}
				onSelect={(date) => {
					if (!date) return
					const serialized = serializeDate(date)
					setDraft(formatDate(serialized))
					void onSetValue(serialized)
				}}
			/>
			<Separator />
			<Button
				variant="ghost"
				size="xs"
				className="note-property-clear"
				onClick={() => {
					void onRemoveValue().then(onClose)
				}}
			>
				Clear
			</Button>
		</div>
	)
}

function PersonValueEditor({
	definition,
	value,
	authorConfig,
	onSetValue,
	onRemoveValue,
	onClose,
}: Omit<PropertyValueEditorProps, "onUpdateDefinition">) {
	if (authorConfig.variant === "text") {
		return (
			<TextValueEditor
				definition={definition}
				value={value}
				onSetValue={onSetValue}
				onRemoveValue={onRemoveValue}
				onClose={onClose}
			/>
		)
	}
	const selected = authorConfig.options.find((person) => person.id === value)
	return (
		<Command className="note-property-command">
			{selected && (
				<div className="note-property-selected-person">
					<Avatar size="sm">
						<AvatarFallback>{getInitials(selected.label)}</AvatarFallback>
					</Avatar>
					<span>{selected.label}</span>
					<Button
						variant="ghost"
						size="icon-xs"
						aria-label={`Remove ${selected.label}`}
						onClick={() => void onRemoveValue()}
					>
						<XIcon />
					</Button>
				</div>
			)}
			<CommandInput autoFocus placeholder="Search for people..." />
			<CommandList>
				<CommandGroup heading="Select a person">
					{authorConfig.options.map((person) => (
						<CommandItem
							key={person.id}
							value={`${person.label} ${person.email ?? ""}`}
							onSelect={() => {
								void onSetValue(person.id).then(onClose)
							}}
						>
							<Avatar size="sm">
								<AvatarFallback>{getInitials(person.label)}</AvatarFallback>
							</Avatar>
							<span>
								{person.label}
								{person.id === authorConfig.currentUserId && (
									<span className="note-property-you"> (You)</span>
								)}
							</span>
							{person.id === value && <CheckIcon className="ml-auto" />}
						</CommandItem>
					))}
				</CommandGroup>
				<CommandEmpty>No people found</CommandEmpty>
			</CommandList>
		</Command>
	)
}

function PropertyValueEditor({
	definition,
	value,
	authorConfig,
	onSetValue,
	onRemoveValue,
	onUpdateDefinition,
	onClose,
}: PropertyValueEditorProps) {
	const propertyType = getPropertyType(definition.type)
	if (!propertyType) {
		return <div className="note-property-editor-message">This property type is unavailable.</div>
	}
	if (propertyType.readOnly) {
		return <div className="note-property-editor-message">This property is managed by Cortex.</div>
	}
	if (isOptionBased(propertyType.baseType)) {
		return (
			<OptionValueEditor
				definition={definition}
				value={value}
				onSetValue={onSetValue}
				onRemoveValue={onRemoveValue}
				onUpdateDefinition={onUpdateDefinition}
				onClose={onClose}
			/>
		)
	}
	if (propertyType.baseType === "date") {
		return (
			<DateValueEditor
				definition={definition}
				value={value}
				onSetValue={onSetValue}
				onRemoveValue={onRemoveValue}
				onClose={onClose}
			/>
		)
	}
	if (propertyType.baseType === "person" || definition.key === "author") {
		return (
			<PersonValueEditor
				definition={definition}
				value={value}
				authorConfig={authorConfig}
				onSetValue={onSetValue}
				onRemoveValue={onRemoveValue}
				onClose={onClose}
			/>
		)
	}
	if (propertyType.baseType === "checkbox") {
		return (
			<Button
				variant="ghost"
				className="note-property-checkbox-editor"
				onClick={() => {
					void onSetValue(value !== true).then(onClose)
				}}
			>
				<Checkbox checked={value === true} aria-label={definition.name} />
				{value === true ? "Checked" : "Unchecked"}
			</Button>
		)
	}
	return (
		<TextValueEditor
			definition={definition}
			value={value}
			onSetValue={onSetValue}
			onRemoveValue={onRemoveValue}
			onClose={onClose}
		/>
	)
}

function PanelHeader({ title, onBack }: { title: string; onBack?: () => void }) {
	return (
		<div className="note-property-popover-header">
			{onBack && (
				<Button variant="ghost" size="icon-xs" aria-label="Back" onClick={onBack}>
					<ChevronLeftIcon />
				</Button>
			)}
			<strong>{title}</strong>
		</div>
	)
}

function PropertySettings({
	definition,
	schema,
	onPush,
	onUpdateDefinition,
	onDeleteDefinition,
	onDuplicateDefinition,
}: PropertySettingsProps) {
	const propertyType = getPropertyType(definition.type)
	const optionBased = isOptionBased(propertyType?.baseType)
	const [name, setName] = useState(definition.name)
	const [nameError, setNameError] = useState<string | null>(null)
	const options = getSortedPropertyOptions(definition)

	const commitName = async () => {
		const trimmedName = name.trim()
		if (!trimmedName) {
			setNameError("Property name is required")
			return
		}
		const duplicate = schema.properties.some(
			(property) =>
				property.id !== definition.id &&
				property.name.toLocaleLowerCase() === trimmedName.toLocaleLowerCase(),
		)
		if (duplicate) {
			setNameError("Property names must be unique")
			return
		}
		if (trimmedName !== definition.name) {
			await onUpdateDefinition({ ...definition, name: trimmedName })
		}
		setNameError(null)
	}

	return (
		<div className="note-property-settings">
			<PanelHeader title="Property inspector" />
			<div className="note-property-name-field">
				<Input
					autoFocus
					value={name}
					aria-label="Property name"
					aria-invalid={Boolean(nameError)}
					onChange={(event) => setName(event.target.value)}
					onBlur={() => void commitName()}
					onKeyDown={(event) => {
						if (event.key === "Enter") void commitName()
					}}
				/>
			</div>
			{nameError && <output className="note-properties-error">{nameError}</output>}
			<div className="note-property-config-list">
				<Button variant="ghost" onClick={() => onPush({ kind: "types" })}>
					<PropertyTypeIcon icon={propertyType?.icon ?? "circle-help"} />
					<span>Type</span>
					<small>{propertyType?.displayName ?? definition.type}</small>
					<ChevronRightIcon />
				</Button>
				{optionBased && (
					<Button variant="ghost" onClick={() => onPush({ kind: "sort" })}>
						<ArrowDownAZIcon />
						<span>Sort</span>
						<small>{definition.optionSort === "alphabetical" ? "Alphabetical" : "Manual"}</small>
						<ChevronRightIcon />
					</Button>
				)}
			</div>
			{optionBased && (
				<>
					<Separator />
					<div className="note-property-options-header">
						<span>Options</span>
						<Button
							variant="ghost"
							size="icon-xs"
							aria-label="Add option"
							onClick={() => {
								const option: PropertyOption = {
									id: crypto.randomUUID(),
									label: "New option",
									color:
										PROPERTY_COLORS[(definition.options?.length ?? 0) % PROPERTY_COLORS.length],
								}
								void onUpdateDefinition({
									...definition,
									options: [...(definition.options ?? []), option],
									optionSort: definition.optionSort ?? "manual",
								}).then(() => onPush({ kind: "option", optionId: option.id }))
							}}
						>
							<PlusIcon />
						</Button>
					</div>
					<ul className="note-property-option-list">
						{options.map((option) => (
							<li className="note-property-option-row" key={option.id}>
								<Button
									variant="ghost"
									className="note-property-option-main"
									onClick={() => onPush({ kind: "option", optionId: option.id })}
								>
									<PropertyOptionValue option={option} />
									<ChevronRightIcon />
								</Button>
							</li>
						))}
					</ul>
				</>
			)}
			<Separator />
			<div className="note-property-settings-actions">
				<Button variant="ghost" onClick={() => void onDuplicateDefinition()}>
					<CopyIcon />
					Duplicate property
				</Button>
				<Button
					variant="ghost"
					className="note-property-delete-action"
					onClick={() => void onDeleteDefinition()}
				>
					<Trash2Icon />
					Delete property
				</Button>
			</div>
		</div>
	)
}

function PropertyTypePicker({ definition, onBack, onUpdateDefinition }: PropertyTypePickerProps) {
	const types =
		definition.key === "author"
			? getPropertyTypes().filter((type) => type.type === "text")
			: getPropertyTypes()
	return (
		<div className="note-property-picker-panel">
			<PanelHeader title="Type" onBack={onBack} />
			<Command className="note-property-command">
				<CommandInput autoFocus placeholder="Search property types..." />
				<CommandList>
					<CommandGroup heading="Property type">
						{types.map((type) => (
							<CommandItem
								key={type.type}
								value={`${type.displayName} ${type.type}`}
								onSelect={() => {
									void onUpdateDefinition(changePropertyType(definition, type.type)).then(onBack)
								}}
							>
								<PropertyTypeIcon icon={type.icon} />
								<span>{type.displayName}</span>
								{type.type === definition.type && <CheckIcon className="ml-auto" />}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandEmpty>No property types found</CommandEmpty>
				</CommandList>
			</Command>
		</div>
	)
}

function PropertySortPicker({ definition, onBack, onUpdateDefinition }: PropertySortPickerProps) {
	return (
		<div className="note-property-picker-panel">
			<PanelHeader title="Sort options" onBack={onBack} />
			<div className="note-property-choice-list">
				{(["manual", "alphabetical"] as const).map((sort) => (
					<Button
						key={sort}
						variant="ghost"
						onClick={() => {
							void onUpdateDefinition({ ...definition, optionSort: sort }).then(onBack)
						}}
					>
						{sort === "manual" ? <PropertyTypeIcon icon="list-end" /> : <ArrowDownAZIcon />}
						<span>{sort === "manual" ? "Manual" : "Alphabetical"}</span>
						{(definition.optionSort ?? "manual") === sort && <CheckIcon className="ml-auto" />}
					</Button>
				))}
			</div>
		</div>
	)
}

function PropertyOptionEditor({
	definition,
	optionId,
	onBack,
	onPush,
	onUpdateDefinition,
}: PropertyOptionEditorProps) {
	const option = definition.options?.find((candidate) => candidate.id === optionId)
	const [label, setLabel] = useState(option?.label ?? "")
	if (!option) {
		return (
			<div className="note-property-picker-panel">
				<PanelHeader title="Option unavailable" onBack={onBack} />
			</div>
		)
	}
	const updateOption = (updates: Partial<PropertyOption>) =>
		onUpdateDefinition({
			...definition,
			options: definition.options?.map((candidate) =>
				candidate.id === option.id ? { ...candidate, ...updates } : candidate,
			),
		})
	return (
		<div className="note-property-option-editor">
			<PanelHeader title="Edit option" onBack={onBack} />
			<Input
				autoFocus
				value={label}
				aria-label="Option label"
				onChange={(event) => setLabel(event.target.value)}
				onBlur={() => {
					const nextLabel = label.trim()
					if (nextLabel && nextLabel !== option.label) void updateOption({ label: nextLabel })
				}}
			/>
			<Button variant="ghost" onClick={() => onPush({ kind: "color", optionId })}>
				<span className="note-property-color-dot" data-color={option.color} />
				<span>Color</span>
				<small>{optionColorLabels[option.color]}</small>
				<ChevronRightIcon />
			</Button>
			{getPropertyType(definition.type)?.baseType === "select" && (
				<div className="note-property-switch-row">
					<span>Default option</span>
					<Switch
						size="sm"
						checked={definition.defaultOptionId === option.id}
						onCheckedChange={(checked) =>
							void onUpdateDefinition({
								...definition,
								defaultOptionId: checked ? option.id : undefined,
							})
						}
					/>
				</div>
			)}
			<Separator />
			<Button
				variant="ghost"
				className="note-property-delete-action"
				onClick={() => {
					void onUpdateDefinition({
						...definition,
						options: definition.options?.filter((candidate) => candidate.id !== option.id),
						defaultOptionId:
							definition.defaultOptionId === option.id ? undefined : definition.defaultOptionId,
					}).then(onBack)
				}}
			>
				<Trash2Icon />
				Delete option
			</Button>
		</div>
	)
}

function PropertyColorPicker({
	definition,
	optionId,
	onBack,
	onUpdateDefinition,
}: PropertyColorPickerProps) {
	const option = definition.options?.find((candidate) => candidate.id === optionId)
	if (!option) return null
	return (
		<div className="note-property-picker-panel">
			<PanelHeader title="Color" onBack={onBack} />
			<div className="note-property-color-list">
				{PROPERTY_COLORS.map((color) => (
					<Button
						key={color}
						variant="ghost"
						onClick={() => {
							void onUpdateDefinition({
								...definition,
								options: definition.options?.map((candidate) =>
									candidate.id === option.id ? { ...candidate, color } : candidate,
								),
							}).then(onBack)
						}}
					>
						<span className="note-property-color-swatch" data-color={color} />
						{optionColorLabels[color]}
						{option.color === color && <CheckIcon className="ml-auto" />}
					</Button>
				))}
			</div>
		</div>
	)
}

function PropertyRow({
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
	const [panels, setPanels] = useState<PropertyPanel[]>([{ kind: "value" }])
	const propertyType = getPropertyType(definition.type)
	const currentPanel = panels[panels.length - 1]
	const readOnly = propertyType?.readOnly === true
	const unavailable = !propertyType
	const openPanel = (panel: PropertyPanel) => {
		setPanels([panel])
		setOpen(true)
	}
	const pushPanel = (panel: PropertyPanel) => setPanels((current) => [...current, panel])
	const popPanel = () =>
		setPanels((current) => (current.length > 1 ? current.slice(0, -1) : current))
	const close = () => setOpen(false)

	const renderPanel = () => {
		if (currentPanel.kind === "settings") {
			return (
				<PropertySettings
					definition={definition}
					schema={schema}
					onPush={pushPanel}
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
		if (currentPanel.kind === "types") {
			return (
				<PropertyTypePicker
					definition={definition}
					onBack={popPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (currentPanel.kind === "sort") {
			return (
				<PropertySortPicker
					definition={definition}
					onBack={popPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (currentPanel.kind === "option") {
			return (
				<PropertyOptionEditor
					definition={definition}
					optionId={currentPanel.optionId}
					onBack={popPanel}
					onPush={pushPanel}
					onUpdateDefinition={onUpdateDefinition}
				/>
			)
		}
		if (currentPanel.kind === "color") {
			return (
				<PropertyColorPicker
					definition={definition}
					optionId={currentPanel.optionId}
					onBack={popPanel}
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
				if (!nextOpen) setPanels([{ kind: "value" }])
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
					if (panels.length <= 1) return
					event.preventDefault()
					popPanel()
				}}
			>
				{renderPanel()}
			</PopoverContent>
		</Popover>
	)
}

function AddPropertyPopover({
	vaultPath,
	schema,
	observedProperties,
	onRegister,
}: AddPropertyPopoverProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [suggestions, setSuggestions] = useState<PropertyDefinition[]>([])
	const definedKeys = useMemo(
		() => new Set(schema.properties.map((property) => property.key)),
		[schema.properties],
	)

	useEffect(() => {
		if (!open) return
		let cancelled = false
		void suggestProperties(query, vaultPath).then((nextSuggestions) => {
			if (!cancelled) {
				setSuggestions(
					nextSuggestions.filter(
						(suggestion) => suggestion.observed && !definedKeys.has(suggestion.key),
					),
				)
			}
		})
		return () => {
			cancelled = true
		}
	}, [definedKeys, open, query, vaultPath])

	const createProperty = async (type: string) => {
		const propertyType = getPropertyType(type)
		const name = query.trim() || propertyType?.displayName || "Property"
		const key = createPropertyKey(name, schema.properties)
		const resolvedType = key === "author" ? "text" : type
		await onRegister({
			id: crypto.randomUUID(),
			key,
			name,
			type: resolvedType,
			createdAt: new Date().toISOString(),
			options: resolvedType === "select" ? [] : undefined,
			optionSort: resolvedType === "select" ? "manual" : undefined,
		})
		setQuery("")
		setOpen(false)
	}

	const visibleObserved = [
		...observedProperties.filter((property) => !definedKeys.has(property.key)),
		...suggestions,
	].filter(
		(property, index, all) =>
			all.findIndex((candidate) => candidate.key === property.key) === index,
	)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverAnchor asChild>
				<Button
					variant="ghost"
					size="xs"
					className="note-property-add-trigger"
					onClick={() => setOpen(true)}
				>
					<PlusIcon />
					Add a property
				</Button>
			</PopoverAnchor>
			<PopoverContent
				align="start"
				side="bottom"
				sideOffset={4}
				className="note-property-popover note-property-add-popover"
			>
				<Command shouldFilter={false} className="note-property-command">
					<CommandInput
						autoFocus
						placeholder="Search or name a property..."
						value={query}
						onValueChange={setQuery}
					/>
					<CommandList>
						{visibleObserved.length > 0 && (
							<CommandGroup heading="From this vault">
								{visibleObserved.map((suggestion) => (
									<CommandItem
										key={suggestion.key}
										value={`${suggestion.name} ${suggestion.key}`}
										onSelect={() => {
											void onRegister({
												...suggestion,
												id: crypto.randomUUID(),
												createdAt: new Date().toISOString(),
												observed: undefined,
											}).then(() => setOpen(false))
										}}
									>
										<SearchIcon />
										<span>{suggestion.name}</span>
										<small>{suggestion.type}</small>
									</CommandItem>
								))}
							</CommandGroup>
						)}
						<CommandGroup heading="Property type">
							{getPropertyTypes().map((type) => (
								<CommandItem
									key={type.type}
									value={`${type.displayName} ${type.type}`}
									onSelect={() => void createProperty(type.type)}
								>
									<PropertyTypeIcon icon={type.icon} />
									<span>{type.displayName}</span>
								</CommandItem>
							))}
						</CommandGroup>
						<CommandEmpty>No property types found</CommandEmpty>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}

export function NotePropertiesPanel({ filePath }: NotePropertiesPanelProps) {
	const vaultPath = useVaultStore((state) => state.vault?.path)
	const [schema, setSchema] = useState<VaultSchema>({ version: 1, properties: [] })
	const [meta, setMeta] = useState<PropertyMap>({})
	const [expanded, setExpanded] = useState(true)
	const [authorConfig, setAuthorConfig] = useState<ResolvedAuthorConfig>({ variant: "text" })
	const [observedProperties, setObservedProperties] = useState<PropertyDefinition[]>([])
	const [error, setError] = useState<string | null>(null)
	const [frontmatterError, setFrontmatterError] = useState<string | null>(null)

	const refresh = useCallback(async () => {
		if (!vaultPath) return
		try {
			const [nextSchema, nextExpanded, nextAuthorConfig] = await Promise.all([
				getVaultSchema(vaultPath),
				getNotePropertiesExpanded(vaultPath, filePath),
				resolveAuthorProperty(vaultPath),
			])
			setSchema(nextSchema)
			setExpanded(nextExpanded)
			setAuthorConfig(nextAuthorConfig)
			try {
				const nextMeta = await getResolvedPropertyMap(filePath)
				setMeta(nextMeta)
				setFrontmatterError(null)
				setObservedProperties(getObservedPropertyDefinitions(nextMeta, nextSchema))
			} catch (parseError) {
				setMeta({})
				setObservedProperties([])
				setFrontmatterError(parseError instanceof Error ? parseError.message : String(parseError))
			}
			setError(null)
		} catch (refreshError) {
			setError(refreshError instanceof Error ? refreshError.message : String(refreshError))
		}
	}, [filePath, vaultPath])

	useEffect(() => {
		void refresh()
		const unsubscribeContent = noteCache.onContentChange(filePath, () => {
			void refresh()
		})
		const unsubscribeSchema = vaultPath
			? onVaultSchemaChange(vaultPath, () => {
					void refresh()
				})
			: () => {}
		return () => {
			unsubscribeContent()
			unsubscribeSchema()
		}
	}, [filePath, refresh, vaultPath])

	const commitSchema = useCallback(
		async (nextSchema: VaultSchema) => {
			if (!vaultPath) return
			try {
				await updateVaultSchema(vaultPath, nextSchema)
				setSchema(nextSchema)
				setError(null)
			} catch (schemaError) {
				setError(schemaError instanceof Error ? schemaError.message : String(schemaError))
				throw schemaError
			}
		},
		[vaultPath],
	)

	const registerProperty = useCallback(
		async (definition: PropertyDefinition) => {
			await commitSchema({
				version: 1,
				properties: [...schema.properties, definition],
			})
		},
		[commitSchema, schema.properties],
	)

	if (!vaultPath) return null

	return (
		<section className="note-properties" aria-label="Note properties">
			<div className="note-properties-header">
				<Button
					variant="ghost"
					size="xs"
					onClick={() => {
						const nextExpanded = !expanded
						setExpanded(nextExpanded)
						void setNotePropertiesExpanded(vaultPath, filePath, nextExpanded)
					}}
				>
					{expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
					Properties
				</Button>
			</div>
			{expanded && (
				<div className="note-properties-content" aria-disabled={Boolean(frontmatterError)}>
					{schema.properties.map((definition) => (
						<PropertyRow
							key={definition.id}
							definition={definition}
							value={meta[definition.key]}
							schema={schema}
							authorConfig={authorConfig}
							onSetValue={async (property, value) => {
								if (frontmatterError) return
								try {
									await setProperty(filePath, property.key, value)
									setError(null)
								} catch (propertyError) {
									setError(
										propertyError instanceof Error ? propertyError.message : String(propertyError),
									)
									throw propertyError
								}
							}}
							onRemoveValue={async (property) => {
								if (frontmatterError) return
								await removeProperty(filePath, property.key)
							}}
							onUpdateDefinition={async (nextDefinition) => {
								await commitSchema({
									version: 1,
									properties: schema.properties.map((property) =>
										property.id === nextDefinition.id ? nextDefinition : property,
									),
								})
							}}
							onDeleteDefinition={async (property) => {
								await commitSchema({
									version: 1,
									properties: schema.properties.filter((candidate) => candidate.id !== property.id),
								})
							}}
							onDuplicateDefinition={async (property) => {
								const duplicate = duplicatePropertyDefinition(property, schema)
								await commitSchema({
									version: 1,
									properties: [...schema.properties, duplicate],
								})
							}}
						/>
					))}
					<AddPropertyPopover
						vaultPath={vaultPath}
						schema={schema}
						observedProperties={observedProperties}
						onRegister={registerProperty}
					/>
					{frontmatterError && (
						<output className="note-properties-error">
							Properties are read-only until the YAML frontmatter is fixed: {frontmatterError}
						</output>
					)}
					{error && <output className="note-properties-error">{error}</output>}
				</div>
			)}
		</section>
	)
}
