import type { PropertyDefinition, ResolvedAuthorConfig, VaultSchema } from "@cortex/properties"

export interface PropertyMutationHandlers {
	onSetValue(definition: PropertyDefinition, value: unknown): Promise<void>
	onRemoveValue(definition: PropertyDefinition): Promise<void>
	onUpdateDefinition(definition: PropertyDefinition): Promise<void>
	onDeleteDefinition(definition: PropertyDefinition): Promise<void>
	onDuplicateDefinition(definition: PropertyDefinition): Promise<void>
}

export interface PropertyRowProps extends PropertyMutationHandlers {
	definition: PropertyDefinition
	value: unknown
	schema: VaultSchema
	authorConfig: ResolvedAuthorConfig
}

export interface PropertyValueEditorProps {
	definition: PropertyDefinition
	value: unknown
	authorConfig: ResolvedAuthorConfig
	onSetValue(value: unknown): Promise<void>
	onRemoveValue(): Promise<void>
	onUpdateDefinition(definition: PropertyDefinition): Promise<void>
	onClose(): void
}

export type PropertyInspectorPanel =
	| { kind: "value" }
	| { kind: "settings" }
	| { kind: "types" }
	| { kind: "sort" }
	| { kind: "option"; optionId: string }
	| { kind: "color"; optionId: string }
