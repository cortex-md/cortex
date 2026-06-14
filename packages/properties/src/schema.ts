import { z } from "zod"
import { getPropertyType } from "./registry"
import { getPropertiesRuntime } from "./runtime"
import { invalidatePropertySuggestions } from "./suggestions"
import {
	PROPERTY_COLORS,
	type PropertyDefinition,
	type PropertyOption,
	type VaultSchema,
} from "./types"

const propertyOptionSchema = z.object({
	id: z.string().uuid(),
	label: z.string().trim().min(1),
	color: z.enum(PROPERTY_COLORS),
})

const propertyDefinitionSchema = z.object({
	id: z.string().uuid(),
	key: z.string().trim().min(1),
	name: z.string().trim().min(1),
	type: z.string().trim().min(1),
	createdAt: z.string().datetime(),
	options: z.array(propertyOptionSchema).optional(),
	defaultOptionId: z.string().uuid().optional(),
	optionSort: z.enum(["manual", "alphabetical"]).optional(),
})

const vaultSchemaSchema = z.object({
	version: z.literal(1),
	properties: z.array(propertyDefinitionSchema),
})

type VaultSchemaChangeListener = () => void

const vaultSchemaChangeListeners = new Map<string, Set<VaultSchemaChangeListener>>()

export function notifyVaultSchemaChanged(vaultPath: string): void {
	invalidatePropertySuggestions(vaultPath)
	for (const listener of vaultSchemaChangeListeners.get(vaultPath) ?? []) listener()
}

export function onVaultSchemaChange(
	vaultPath: string,
	listener: VaultSchemaChangeListener,
): () => void {
	const listeners =
		vaultSchemaChangeListeners.get(vaultPath) ?? new Set<VaultSchemaChangeListener>()
	listeners.add(listener)
	vaultSchemaChangeListeners.set(vaultPath, listeners)
	return () => {
		listeners.delete(listener)
		if (listeners.size === 0) vaultSchemaChangeListeners.delete(vaultPath)
	}
}

function isMissingFileError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	return /not found|no such file|os error 2/i.test(message)
}

function assertUniqueDefinitions(properties: PropertyDefinition[]): void {
	const ids = new Set<string>()
	const keys = new Set<string>()
	const names = new Set<string>()
	for (const property of properties) {
		const key = property.key.toLocaleLowerCase()
		const name = property.name.toLocaleLowerCase()
		if (ids.has(property.id)) throw new Error(`Duplicate property id "${property.id}"`)
		if (keys.has(key)) throw new Error(`Duplicate property key "${property.key}"`)
		if (names.has(name)) throw new Error(`Duplicate property name "${property.name}"`)
		ids.add(property.id)
		keys.add(key)
		names.add(name)
	}
}

function isOptionDefinition(definition: PropertyDefinition): boolean {
	const baseType = getPropertyType(definition.type)?.baseType
	return baseType === "select"
}

function validateOptions(definition: PropertyDefinition): void {
	if (!isOptionDefinition(definition)) return
	const options = definition.options ?? []
	const optionIds = new Set<string>()
	for (const option of options) {
		propertyOptionSchema.parse(option)
		if (optionIds.has(option.id)) throw new Error(`Duplicate property option id "${option.id}"`)
		optionIds.add(option.id)
	}
	if (definition.defaultOptionId && !optionIds.has(definition.defaultOptionId)) {
		throw new Error(`Unknown default select option "${definition.defaultOptionId}"`)
	}
	if (definition.defaultOptionId && getPropertyType(definition.type)?.baseType !== "select") {
		throw new Error("Only select properties can define a default option")
	}
}

export function defineProperty(definition: PropertyDefinition): PropertyDefinition {
	const parsed = propertyDefinitionSchema.parse(definition) as PropertyDefinition
	if (parsed.key.toLocaleLowerCase() === "author" && parsed.type !== "text") {
		throw new Error('The reserved "author" property must use the text type')
	}
	validateOptions(parsed)
	return {
		...parsed,
		key: parsed.key.trim(),
		name: parsed.name.trim(),
		options: parsed.options?.map((option: PropertyOption) => ({ ...option })),
	}
}

function createUniquePropertyName(name: string, properties: PropertyDefinition[]): string {
	const names = new Set(properties.map((property) => property.name.toLocaleLowerCase()))
	const copyName = `${name} copy`
	if (!names.has(copyName.toLocaleLowerCase())) return copyName
	let suffix = 2
	while (names.has(`${copyName} ${suffix}`.toLocaleLowerCase())) suffix++
	return `${copyName} ${suffix}`
}

export function createPropertyKey(name: string, properties: PropertyDefinition[]): string {
	const baseKey =
		name
			.trim()
			.toLocaleLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "property"
	const keys = new Set(properties.map((property) => property.key.toLocaleLowerCase()))
	if (!keys.has(baseKey)) return baseKey
	let suffix = 2
	while (keys.has(`${baseKey}-${suffix}`)) suffix++
	return `${baseKey}-${suffix}`
}

export function changePropertyType(
	definition: PropertyDefinition,
	type: string,
): PropertyDefinition {
	const currentBaseType = getPropertyType(definition.type)?.baseType
	const nextBaseType = getPropertyType(type)?.baseType
	const currentUsesOptions = currentBaseType === "select"
	const nextUsesOptions = nextBaseType === "select"
	return defineProperty({
		...definition,
		type,
		options: nextUsesOptions ? (currentUsesOptions ? definition.options : []) : undefined,
		defaultOptionId: nextBaseType === "select" ? definition.defaultOptionId : undefined,
		optionSort: nextUsesOptions ? (definition.optionSort ?? "manual") : undefined,
	})
}

export function duplicatePropertyDefinition(
	definition: PropertyDefinition,
	schema: VaultSchema,
	createId: () => string = () => crypto.randomUUID(),
	createdAt = new Date().toISOString(),
): PropertyDefinition {
	const name = createUniquePropertyName(definition.name, schema.properties)
	const optionIds = new Map<string, string>()
	const options = definition.options?.map((option) => {
		const id = createId()
		optionIds.set(option.id, id)
		return { ...option, id }
	})
	return defineProperty({
		...definition,
		id: createId(),
		key: createPropertyKey(name, schema.properties),
		name,
		createdAt,
		options,
		defaultOptionId: definition.defaultOptionId
			? optionIds.get(definition.defaultOptionId)
			: undefined,
		observed: undefined,
	})
}

export function getSortedPropertyOptions(definition: PropertyDefinition): PropertyOption[] {
	const options = definition.options?.map((option) => ({ ...option })) ?? []
	return definition.optionSort === "alphabetical"
		? options.sort((left, right) => left.label.localeCompare(right.label))
		: options
}

export function validateVaultSchema(schema: VaultSchema): VaultSchema {
	const parsed = vaultSchemaSchema.parse(schema) as VaultSchema
	const properties = parsed.properties.map(defineProperty)
	assertUniqueDefinitions(properties)
	return { version: 1, properties }
}

export function isPropertyDefinitionEditable(definition: PropertyDefinition): boolean {
	return Boolean(getPropertyType(definition.type))
}

export async function getVaultSchema(vaultPath: string): Promise<VaultSchema> {
	const runtime = getPropertiesRuntime()
	try {
		const raw = await runtime.readFile(`${vaultPath}/.cortex/schema/properties.json`)
		const data = JSON.parse(raw) as unknown
		return validateVaultSchema(data as VaultSchema)
	} catch (error) {
		if (isMissingFileError(error)) return { version: 1, properties: [] }
		throw error
	}
}

export async function updateVaultSchema(vaultPath: string, schema: VaultSchema): Promise<void> {
	const runtime = getPropertiesRuntime()
	const validated = validateVaultSchema(schema)
	const current = await getVaultSchema(vaultPath)
	const currentKeys = new Map(current.properties.map((property) => [property.id, property.key]))
	for (const property of validated.properties) {
		const currentKey = currentKeys.get(property.id)
		if (currentKey && currentKey !== property.key) {
			throw new Error(`Property key "${currentKey}" is immutable`)
		}
	}
	await runtime.atomicWriteFile(
		`${vaultPath}/.cortex/schema/properties.json`,
		JSON.stringify(validated, null, "\t"),
	)
	notifyVaultSchemaChanged(vaultPath)
}
