import { resolvePropertyActor } from "./author"
import { parseFrontmatter, setFrontmatterValue } from "./frontmatter"
import { getPropertyType } from "./registry"
import { getOptionalPropertiesRuntime } from "./runtime"
import { getVaultSchema } from "./schema"
import type { PropertyDefinition, VaultSchema } from "./types"

function getSystemDefinition(schema: VaultSchema, type: string): PropertyDefinition | undefined {
	return schema.properties.find((property) => property.type === type)
}

async function applySystemValues(
	vaultPath: string,
	raw: string,
	options: {
		filePath?: string
		newNote: boolean
		duplicate: boolean
		updateEdited: boolean
	},
): Promise<string> {
	const runtime = getOptionalPropertiesRuntime()
	if (!runtime) return raw
	const schema = await getVaultSchema(vaultPath)
	if (schema.properties.length === 0) return raw
	const actor = await resolvePropertyActor(vaultPath)
	const timestamp = (runtime.now?.() ?? new Date()).toISOString()
	const sourceMetadata = options.filePath
		? await runtime.getNoteSourceMetadata(options.filePath)
		: undefined
	const createdTimestamp =
		!options.duplicate && sourceMetadata?.createdAt ? sourceMetadata.createdAt : timestamp
	const createdActor =
		!options.duplicate && sourceMetadata?.createdBy ? sourceMetadata.createdBy : actor
	const createId = runtime.createId ?? (() => crypto.randomUUID())
	let updated = raw
	const meta = parseFrontmatter(raw).meta
	const id = getSystemDefinition(schema, "id")
	if (id && (options.duplicate || meta[id.key] === undefined)) {
		updated = setFrontmatterValue(updated, id.key, createId())
	}
	const createdTime = getSystemDefinition(schema, "created_time")
	if (createdTime && (options.duplicate || meta[createdTime.key] === undefined)) {
		updated = setFrontmatterValue(updated, createdTime.key, createdTimestamp)
	}
	const createdBy = getSystemDefinition(schema, "created_by")
	if (createdBy && (options.duplicate || meta[createdBy.key] === undefined)) {
		updated = setFrontmatterValue(updated, createdBy.key, createdActor)
	}
	if (options.newNote) {
		for (const definition of schema.properties) {
			if (
				getPropertyType(definition.type)?.baseType === "select" &&
				definition.defaultOptionId &&
				meta[definition.key] === undefined
			) {
				updated = setFrontmatterValue(updated, definition.key, definition.defaultOptionId)
			}
		}
	}
	if (options.updateEdited) {
		const editedTime = getSystemDefinition(schema, "last_edited_time")
		if (editedTime) updated = setFrontmatterValue(updated, editedTime.key, timestamp)
		const editedBy = getSystemDefinition(schema, "last_edited_by")
		if (editedBy) updated = setFrontmatterValue(updated, editedBy.key, actor)
	}
	return updated
}

export async function createNoteWithPropertyDefaults(
	vaultPath: string,
	body = "",
): Promise<string> {
	return applySystemValues(vaultPath, body, {
		newNote: true,
		duplicate: false,
		updateEdited: true,
	})
}

export async function prepareDuplicatedNote(vaultPath: string, raw: string): Promise<string> {
	return applySystemValues(vaultPath, raw, {
		newNote: true,
		duplicate: true,
		updateEdited: true,
	})
}

export async function prepareNoteForSave(filePath: string, raw: string): Promise<string> {
	const runtime = getOptionalPropertiesRuntime()
	if (!runtime) return raw
	const vaultPath = runtime.resolveVaultPath(filePath)
	if (!vaultPath) return raw
	return applySystemValues(vaultPath, raw, {
		filePath,
		newNote: false,
		duplicate: false,
		updateEdited: true,
	})
}
