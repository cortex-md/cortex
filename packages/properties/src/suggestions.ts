import { parseFrontmatter } from "./frontmatter"
import { getPropertiesRuntime } from "./runtime"
import { getVaultSchema } from "./schema"
import type { PrimitivePropertyType, PropertyDefinition, PropertyMap, VaultSchema } from "./types"

const excludedObservedKeys = new Set(["tags", "aliases", "cortex-tags"])

interface IndexedProperty {
	definition: PropertyDefinition
	usage: number
}

interface SuggestionCacheEntry {
	generation: number
	builtGeneration: number
	indexed: IndexedProperty[] | null
	pending: Promise<void> | null
}

const suggestionCache = new Map<string, SuggestionCacheEntry>()

function isScalar(value: unknown): boolean {
	return (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value instanceof Date
	)
}

function inferType(value: unknown): PrimitivePropertyType {
	if (typeof value === "boolean") return "checkbox"
	if (typeof value === "number") return "number"
	if (value instanceof Date) return "date"
	if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return "date"
	if (typeof value === "string" && /^https?:\/\//i.test(value)) return "url"
	if (typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email"
	return "text"
}

function displayNameFromKey(key: string): string {
	return key.replaceAll(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function fuzzyScore(query: string, candidate: string): number {
	if (!query) return 1
	const normalizedQuery = query.toLocaleLowerCase()
	const normalizedCandidate = candidate.toLocaleLowerCase()
	if (normalizedCandidate === normalizedQuery) return 100
	if (normalizedCandidate.startsWith(normalizedQuery)) return 75
	if (normalizedCandidate.includes(normalizedQuery)) return 50
	let queryIndex = 0
	for (const character of normalizedCandidate) {
		if (character === normalizedQuery[queryIndex]) queryIndex++
		if (queryIndex === normalizedQuery.length) return 25
	}
	return 0
}

async function buildIndex(vaultPath: string): Promise<IndexedProperty[]> {
	const runtime = getPropertiesRuntime()
	const schema = await getVaultSchema(vaultPath)
	const indexed = new Map<string, IndexedProperty>(
		schema.properties.map((definition) => [
			definition.key.toLocaleLowerCase(),
			{ definition, usage: 0 },
		]),
	)
	for (const filePath of await runtime.listMarkdownFiles(vaultPath)) {
		try {
			const { meta } = parseFrontmatter(await runtime.readNote(filePath))
			for (const [key, value] of Object.entries(meta)) {
				if (excludedObservedKeys.has(key.toLocaleLowerCase())) continue
				const normalizedKey = key.toLocaleLowerCase()
				const existing = indexed.get(normalizedKey)
				if (existing) {
					existing.usage++
					continue
				}
				if (!isScalar(value)) continue
				indexed.set(normalizedKey, {
					definition: {
						id: crypto.randomUUID(),
						key,
						name: displayNameFromKey(key),
						type: inferType(value),
						createdAt: new Date(0).toISOString(),
						observed: true,
					},
					usage: 1,
				})
			}
		} catch {}
	}
	return Array.from(indexed.values())
}

function getSuggestionCacheEntry(vaultPath: string): SuggestionCacheEntry {
	const existing = suggestionCache.get(vaultPath)
	if (existing) return existing
	const entry: SuggestionCacheEntry = {
		generation: 0,
		builtGeneration: -1,
		indexed: null,
		pending: null,
	}
	suggestionCache.set(vaultPath, entry)
	return entry
}

async function getSuggestionIndex(vaultPath: string): Promise<IndexedProperty[]> {
	const entry = getSuggestionCacheEntry(vaultPath)
	while (entry.indexed === null || entry.builtGeneration !== entry.generation) {
		if (!entry.pending) {
			const generation = entry.generation
			entry.pending = buildIndex(vaultPath)
				.then((indexed) => {
					if (entry.generation === generation) {
						entry.indexed = indexed
						entry.builtGeneration = generation
					}
				})
				.finally(() => {
					entry.pending = null
				})
		}
		await entry.pending
	}
	return entry.indexed
}

export function getObservedPropertyDefinitions(
	meta: PropertyMap,
	schema: VaultSchema,
): PropertyDefinition[] {
	const definedKeys = new Set(
		schema.properties.map((definition) => definition.key.toLocaleLowerCase()),
	)
	const observed: PropertyDefinition[] = []
	for (const [key, value] of Object.entries(meta)) {
		const normalizedKey = key.toLocaleLowerCase()
		if (
			definedKeys.has(normalizedKey) ||
			excludedObservedKeys.has(normalizedKey) ||
			!isScalar(value)
		) {
			continue
		}
		observed.push({
			id: `observed:${key}`,
			key,
			name: displayNameFromKey(key),
			type: inferType(value),
			createdAt: new Date(0).toISOString(),
			observed: true,
		})
	}
	return observed
}

export function invalidatePropertySuggestions(vaultPath?: string): void {
	if (vaultPath) {
		const entry = getSuggestionCacheEntry(vaultPath)
		entry.generation++
		entry.indexed = null
		return
	}
	for (const entry of suggestionCache.values()) {
		entry.generation++
		entry.indexed = null
	}
}

export async function suggestProperties(
	query: string,
	vaultPath: string,
): Promise<PropertyDefinition[]> {
	const normalizedQuery = query.trim()
	return (await getSuggestionIndex(vaultPath))
		.map((entry) => ({
			...entry,
			score: Math.max(
				fuzzyScore(normalizedQuery, entry.definition.name),
				fuzzyScore(normalizedQuery, entry.definition.key),
			),
		}))
		.filter((entry) => entry.score > 0)
		.sort(
			(left, right) =>
				right.score - left.score ||
				right.usage - left.usage ||
				left.definition.name.localeCompare(right.definition.name),
		)
		.map((entry) => entry.definition)
}
