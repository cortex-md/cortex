import { validateVaultSchema } from "./definitions"
import { invalidatePropertySuggestions } from "./discovery/suggestions"
import { getPropertiesRuntime } from "./runtime"
import type { VaultSchema } from "./types"

type VaultSchemaChangeListener = () => void

const vaultSchemaChangeListeners = new Map<string, Set<VaultSchemaChangeListener>>()

function isMissingFileError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	return /not found|no such file|os error 2/i.test(message)
}

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

export async function getVaultSchema(vaultPath: string): Promise<VaultSchema> {
	const runtime = getPropertiesRuntime()
	try {
		const raw = await runtime.files.readFile(`${vaultPath}/.cortex/schema/properties.json`)
		return validateVaultSchema(JSON.parse(raw) as VaultSchema)
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
	await runtime.files.atomicWriteFile(
		`${vaultPath}/.cortex/schema/properties.json`,
		JSON.stringify(validated, null, "\t"),
	)
	notifyVaultSchemaChanged(vaultPath)
}
