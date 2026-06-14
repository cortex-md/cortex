import { resolvePropertyActorValue } from "./author"
import { parseFrontmatter, removeFrontmatterValue, setFrontmatterValue } from "./frontmatter"
import { getPropertyType } from "./registry"
import { getPropertiesRuntime } from "./runtime"
import { getVaultSchema } from "./schema"
import { invalidatePropertySuggestions } from "./suggestions"
import type { PropertyMap } from "./types"

function isEmptyValue(value: unknown): boolean {
	return value === undefined || value === null || value === ""
}

export async function getPropertyMap(filePath: string): Promise<PropertyMap> {
	const raw = await getPropertiesRuntime().readNote(filePath)
	return parseFrontmatter(raw).meta
}

export async function getResolvedPropertyMap(filePath: string): Promise<PropertyMap> {
	const runtime = getPropertiesRuntime()
	const vaultPath = runtime.resolveVaultPath(filePath)
	if (!vaultPath) return getPropertyMap(filePath)
	const [raw, schema, sourceMetadata] = await Promise.all([
		runtime.readNote(filePath),
		getVaultSchema(vaultPath),
		runtime.getNoteSourceMetadata(filePath),
	])
	const meta = parseFrontmatter(raw).meta
	const resolved = { ...meta }
	const remoteAuthoritative =
		sourceMetadata.source === "remote" && sourceMetadata.synced && !sourceMetadata.dirty
	for (const definition of schema.properties) {
		const current = meta[definition.key]
		let value = current
		if (definition.type === "created_time") {
			value = remoteAuthoritative
				? (sourceMetadata.createdAt ?? current)
				: (current ?? sourceMetadata.createdAt)
		}
		if (definition.type === "created_by") {
			value = remoteAuthoritative
				? (sourceMetadata.createdBy ?? current)
				: (current ?? sourceMetadata.createdBy)
		}
		if (definition.type === "last_edited_time") {
			value = remoteAuthoritative
				? (sourceMetadata.lastEditedAt ?? current)
				: (current ?? sourceMetadata.lastEditedAt)
		}
		if (definition.type === "last_edited_by") {
			value = remoteAuthoritative
				? (sourceMetadata.lastEditedBy ?? current)
				: (current ?? sourceMetadata.lastEditedBy)
		}
		if (
			(definition.type === "created_by" || definition.type === "last_edited_by") &&
			value !== undefined &&
			value !== null &&
			value !== ""
		) {
			resolved[definition.key] = await resolvePropertyActorValue(vaultPath, value)
		} else if (value !== undefined) {
			resolved[definition.key] = value
		}
	}
	return resolved
}

export async function setProperty(filePath: string, key: string, value: unknown): Promise<void> {
	if (isEmptyValue(value)) {
		await removeProperty(filePath, key)
		return
	}
	const runtime = getPropertiesRuntime()
	const vaultPath = runtime.resolveVaultPath(filePath)
	if (!vaultPath) throw new Error(`Cannot resolve vault for "${filePath}"`)
	const schema = await getVaultSchema(vaultPath)
	const definition = schema.properties.find((property) => property.key === key)
	if (definition) {
		const type = getPropertyType(definition.type)
		if (!type) throw new Error(`Property type "${definition.type}" is unavailable`)
		if (type.readOnly) throw new Error(`Property "${definition.name}" is read-only`)
		const validation = type.validate(value)
		if (!validation.valid) throw new Error(validation.message ?? "Invalid property value")
		value = type.serialize(value)
	}
	const raw = await runtime.readNote(filePath)
	await runtime.writeNote(filePath, setFrontmatterValue(raw, key, value))
	invalidatePropertySuggestions(vaultPath)
}

export async function removeProperty(filePath: string, key: string): Promise<void> {
	const runtime = getPropertiesRuntime()
	const raw = await runtime.readNote(filePath)
	const updated = removeFrontmatterValue(raw, key)
	if (updated !== raw) await runtime.writeNote(filePath, updated)
	const vaultPath = runtime.resolveVaultPath(filePath)
	if (vaultPath) invalidatePropertySuggestions(vaultPath)
}
