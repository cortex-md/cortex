import { noteCache, useVaultStore } from "@cortex/core"
import {
	duplicatePropertyDefinition,
	getNotePropertiesExpanded,
	getVaultSchema,
	loadNotePropertiesSnapshot,
	type NotePropertiesSnapshot,
	onVaultSchemaChange,
	type PropertyDefinition,
	removeProperty,
	setNotePropertiesExpanded,
	setProperty,
	updateVaultSchema,
	type VaultSchema,
} from "@cortex/properties"
import { useCallback, useEffect, useRef, useState } from "react"

const emptySnapshot: NotePropertiesSnapshot = {
	schema: { version: 1, properties: [] },
	persistedMeta: {},
	resolvedMeta: {},
	authorConfig: { variant: "text" },
	observedDefinitions: [],
}

export function useNotePropertiesPanel(filePath: string) {
	const vaultPath = useVaultStore((state) => state.vault?.path)
	const [snapshot, setSnapshot] = useState(emptySnapshot)
	const [expanded, setExpanded] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [frontmatterError, setFrontmatterError] = useState<string | null>(null)
	const refreshGeneration = useRef(0)

	const refreshSnapshot = useCallback(async () => {
		if (!vaultPath) return
		const generation = ++refreshGeneration.current
		try {
			const nextSnapshot = await loadNotePropertiesSnapshot(filePath)
			if (generation !== refreshGeneration.current) return
			setSnapshot(nextSnapshot)
			setFrontmatterError(null)
			setError(null)
		} catch (refreshError) {
			if (generation !== refreshGeneration.current) return
			try {
				const schema = await getVaultSchema(vaultPath)
				if (generation === refreshGeneration.current) {
					setSnapshot({ ...emptySnapshot, schema })
				}
			} catch {}
			setFrontmatterError(
				refreshError instanceof Error ? refreshError.message : String(refreshError),
			)
		}
	}, [filePath, vaultPath])

	useEffect(() => {
		if (!vaultPath) return
		let cancelled = false
		void getNotePropertiesExpanded(vaultPath, filePath).then((nextExpanded) => {
			if (!cancelled) setExpanded(nextExpanded)
		})
		return () => {
			cancelled = true
		}
	}, [filePath, vaultPath])

	useEffect(() => {
		void refreshSnapshot()
		const unsubscribeContent = noteCache.onContentChange(filePath, () => {
			void refreshSnapshot()
		})
		const unsubscribeSchema = vaultPath
			? onVaultSchemaChange(vaultPath, () => {
					void refreshSnapshot()
				})
			: () => {}
		return () => {
			refreshGeneration.current++
			unsubscribeContent()
			unsubscribeSchema()
		}
	}, [filePath, refreshSnapshot, vaultPath])

	const commitSchema = useCallback(
		async (nextSchema: VaultSchema) => {
			if (!vaultPath) return
			try {
				await updateVaultSchema(vaultPath, nextSchema)
				setSnapshot((current) => ({ ...current, schema: nextSchema }))
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
				properties: [...snapshot.schema.properties, definition],
			})
		},
		[commitSchema, snapshot.schema.properties],
	)

	const updateDefinition = useCallback(
		async (definition: PropertyDefinition) => {
			await commitSchema({
				version: 1,
				properties: snapshot.schema.properties.map((property) =>
					property.id === definition.id ? definition : property,
				),
			})
		},
		[commitSchema, snapshot.schema.properties],
	)

	const deleteDefinition = useCallback(
		async (definition: PropertyDefinition) => {
			await commitSchema({
				version: 1,
				properties: snapshot.schema.properties.filter(
					(candidate) => candidate.id !== definition.id,
				),
			})
		},
		[commitSchema, snapshot.schema.properties],
	)

	const duplicateDefinition = useCallback(
		async (definition: PropertyDefinition) => {
			const duplicate = duplicatePropertyDefinition(definition, snapshot.schema)
			await commitSchema({
				version: 1,
				properties: [...snapshot.schema.properties, duplicate],
			})
		},
		[commitSchema, snapshot.schema],
	)

	const setValue = useCallback(
		async (definition: PropertyDefinition, value: unknown) => {
			if (frontmatterError) return
			try {
				await setProperty(filePath, definition.key, value)
				setError(null)
			} catch (propertyError) {
				setError(propertyError instanceof Error ? propertyError.message : String(propertyError))
				throw propertyError
			}
		},
		[filePath, frontmatterError],
	)

	const removeValue = useCallback(
		async (definition: PropertyDefinition) => {
			if (frontmatterError) return
			await removeProperty(filePath, definition.key)
		},
		[filePath, frontmatterError],
	)

	const toggleExpanded = useCallback(() => {
		if (!vaultPath) return
		const nextExpanded = !expanded
		setExpanded(nextExpanded)
		void setNotePropertiesExpanded(vaultPath, filePath, nextExpanded)
	}, [expanded, filePath, vaultPath])

	return {
		authorConfig: snapshot.authorConfig,
		deleteDefinition,
		duplicateDefinition,
		error,
		expanded,
		frontmatterError,
		meta: snapshot.resolvedMeta,
		observedProperties: snapshot.observedDefinitions,
		registerProperty,
		removeValue,
		schema: snapshot.schema,
		setValue,
		toggleExpanded,
		updateDefinition,
		vaultPath,
	}
}
