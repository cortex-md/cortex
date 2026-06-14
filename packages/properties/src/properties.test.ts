import { resolveAuthorProperty } from "./author"
import { getPropertyMap, getResolvedPropertyMap, setProperty } from "./operations"
import { getPropertyType, registerPropertyType, resetCustomPropertyTypes } from "./registry"
import {
	changePropertyType,
	defineProperty,
	duplicatePropertyDefinition,
	getSortedPropertyOptions,
	getVaultSchema,
	updateVaultSchema,
	validateVaultSchema,
} from "./schema"
import { invalidatePropertySuggestions, suggestProperties } from "./suggestions"
import { createNoteWithPropertyDefaults, prepareDuplicatedNote, prepareNoteForSave } from "./system"
import { createTestPropertiesRuntime } from "./testRuntime"
import type { PropertyDefinition, VaultSchema } from "./types"
import {
	getNotePropertiesExpanded,
	removeNotePropertiesUiState,
	renameNotePropertiesUiState,
	setNotePropertiesExpanded,
} from "./uiState"

const selectProperty: PropertyDefinition = {
	id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
	key: "workflow",
	name: "Workflow",
	type: "select",
	createdAt: "2026-06-13T00:00:00.000Z",
	options: [
		{
			id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
			label: "Done",
			color: "green",
		},
	],
	defaultOptionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
}

function systemSchema(): VaultSchema {
	return {
		version: 1,
		properties: [
			selectProperty,
			{
				id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
				key: "note-id",
				name: "ID",
				type: "id",
				createdAt: "2026-06-13T00:00:00.000Z",
			},
			{
				id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
				key: "created-time",
				name: "Created time",
				type: "created_time",
				createdAt: "2026-06-13T00:00:00.000Z",
			},
			{
				id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
				key: "created-by",
				name: "Created by",
				type: "created_by",
				createdAt: "2026-06-13T00:00:00.000Z",
			},
			{
				id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
				key: "edited-time",
				name: "Edited time",
				type: "last_edited_time",
				createdAt: "2026-06-13T00:00:00.000Z",
			},
			{
				id: "12121212-1212-4212-8212-121212121212",
				key: "edited-by",
				name: "Edited by",
				type: "last_edited_by",
				createdAt: "2026-06-13T00:00:00.000Z",
			},
		],
	}
}

describe("property registry and schema", () => {
	afterEach(() => resetCustomPropertyTypes())

	it("provides validation and codecs for every built-in type", () => {
		const examples: Array<[string, unknown, unknown]> = [
			["text", "value", 1],
			["number", 2, "2"],
			["select", "option-id", ""],
			["person", "user-id", 2],
			["date", "2026-06-13", "June 13"],
			["checkbox", true, "true"],
			["url", "https://cortex.dev", "cortex"],
			["email", "user@cortex.dev", "bad"],
			["phone", "+1 555 0100", "x"],
			["created_time", "2026-06-13T12:00:00.000Z", "today"],
			["created_by", "user-id", ""],
			["last_edited_time", "2026-06-13T12:00:00.000Z", "today"],
			["last_edited_by", "user-id", ""],
			["id", "note-id", ""],
		]
		for (const [type, valid, invalid] of examples) {
			const definition = getPropertyType(type)
			expect(definition?.validate(valid)).toEqual({ valid: true })
			expect(definition?.validate(invalid).valid).toBe(false)
			expect(definition?.deserialize(definition.serialize(valid))).toEqual(valid)
		}
		expect(getPropertyType("created_time")?.readOnly).toBe(true)
	})

	it("preserves options while select remains option based", () => {
		const updated = changePropertyType(selectProperty, "select")
		expect(updated).toMatchObject({
			type: "select",
			options: selectProperty.options,
			defaultOptionId: selectProperty.defaultOptionId,
			optionSort: "manual",
		})
		expect(changePropertyType(selectProperty, "text")).toMatchObject({
			type: "text",
			options: undefined,
			optionSort: undefined,
		})
	})

	it("duplicates definitions with fresh option IDs and sorted views", () => {
		const secondOption = {
			id: "abababab-abab-4bab-8bab-abababababab",
			label: "Backlog",
			color: "gray" as const,
		}
		const schema: VaultSchema = {
			version: 1,
			properties: [
				{
					...selectProperty,
					options: [...(selectProperty.options ?? []), secondOption],
					optionSort: "alphabetical",
				},
			],
		}
		let id = 0
		const duplicate = duplicatePropertyDefinition(
			schema.properties[0],
			schema,
			() => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
			"2026-06-14T00:00:00.000Z",
		)
		expect(duplicate.name).toBe("Workflow copy")
		expect(duplicate.key).toBe("workflow-copy")
		expect(duplicate.id).not.toBe(selectProperty.id)
		expect(duplicate.options?.map((option) => option.id)).not.toEqual(
			selectProperty.options?.map((option) => option.id),
		)
		expect(getSortedPropertyOptions(schema.properties[0]).map((option) => option.label)).toEqual([
			"Backlog",
			"Done",
		])
	})

	it("registers and disposes custom property types", () => {
		const dispose = registerPropertyType({
			type: "rating",
			baseType: "number",
			displayName: "Rating",
			icon: "star",
			deserialize: (value) => value,
			serialize: (value) => value,
			validate: (value) => ({ valid: typeof value === "number" }),
		})
		expect(getPropertyType("rating")?.baseType).toBe("number")
		dispose()
		expect(getPropertyType("rating")).toBeUndefined()
		expect(() =>
			registerPropertyType({
				type: "invalid",
				baseType: "formula" as never,
				displayName: "Invalid",
				icon: "x",
				deserialize: (value) => value,
				serialize: (value) => value,
				validate: () => ({ valid: true }),
			}),
		).toThrow("invalid base type")
	})

	it("requires unique immutable keys and valid select defaults", () => {
		expect(defineProperty(selectProperty)).toEqual(selectProperty)
		expect(() =>
			validateVaultSchema({
				version: 1,
				properties: [selectProperty, { ...selectProperty, id: crypto.randomUUID() }],
			}),
		).toThrow("Duplicate property key")
		expect(() =>
			defineProperty({
				...selectProperty,
				defaultOptionId: "13131313-1313-4313-8313-131313131313",
			}),
		).toThrow("Unknown default select option")
		expect(() => defineProperty({ ...selectProperty, key: "author" })).toThrow(
			"must use the text type",
		)
	})

	it("loads missing schemas and writes valid schemas atomically", async () => {
		const testRuntime = createTestPropertiesRuntime()
		expect(await getVaultSchema("/vault")).toEqual({ version: 1, properties: [] })
		await updateVaultSchema("/vault", { version: 1, properties: [selectProperty] })
		expect(testRuntime.atomicWrites).toEqual(["/vault/.cortex/schema/properties.json"])
		expect(await getVaultSchema("/vault")).toEqual({
			version: 1,
			properties: [selectProperty],
		})
	})

	it("does not rewrite malformed or unsupported schemas", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": '{"version":2,"properties":[]}',
		})
		await expect(getVaultSchema("/vault")).rejects.toThrow()
		expect(testRuntime.atomicWrites).toEqual([])
		testRuntime.files.set("/vault/.cortex/schema/properties.json", "{")
		await expect(getVaultSchema("/vault")).rejects.toThrow()
		expect(testRuntime.atomicWrites).toEqual([])
	})

	it("rejects key changes and preserves the schema after atomic write failures", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [selectProperty],
			}),
		})
		await expect(
			updateVaultSchema("/vault", {
				version: 1,
				properties: [{ ...selectProperty, key: "renamed-workflow" }],
			}),
		).rejects.toThrow("immutable")
		testRuntime.runtime.atomicWriteFile = async () => {
			throw new Error("disk full")
		}
		await expect(updateVaultSchema("/vault", { version: 1, properties: [] })).rejects.toThrow(
			"disk full",
		)
		expect(await getVaultSchema("/vault")).toEqual({
			version: 1,
			properties: [selectProperty],
		})
	})
})

describe("property operations and discovery", () => {
	it("validates schema-backed values and preserves orphaned select IDs", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [selectProperty],
			}),
			"/vault/note.md": "---\nworkflow: orphaned-id\n---\nBody",
		})
		expect((await getPropertyMap("/vault/note.md")).workflow).toBe("orphaned-id")
		await updateVaultSchema("/vault", {
			version: 1,
			properties: [{ ...selectProperty, options: [], defaultOptionId: undefined }],
		})
		expect((await getPropertyMap("/vault/note.md")).workflow).toBe("orphaned-id")
		await expect(setProperty("/vault/note.md", "workflow", "")).resolves.toBeUndefined()
		await expect(setProperty("/vault/note.md", "workflow", 2)).rejects.toThrow()
		testRuntime.files.set(
			"/vault/.cortex/schema/properties.json",
			JSON.stringify({
				version: 1,
				properties: [{ ...selectProperty, type: "missing:type" }],
			}),
		)
		await expect(setProperty("/vault/note.md", "workflow", "value")).rejects.toThrow("unavailable")
	})

	it("preserves legacy status definitions as unavailable types", async () => {
		createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [{ ...selectProperty, type: "status" }],
			}),
			"/vault/note.md": "---\nworkflow: legacy-option\n---\nBody",
		})
		expect(getPropertyType("status")).toBeUndefined()
		expect((await getPropertyMap("/vault/note.md")).workflow).toBe("legacy-option")
		await expect(setProperty("/vault/note.md", "workflow", "replacement")).rejects.toThrow(
			"unavailable",
		)
	})

	it("ranks schema and observed scalar suggestions while excluding reserved keys", async () => {
		createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [
					{
						id: crypto.randomUUID(),
						key: "project",
						name: "Project",
						type: "text",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
				],
			}),
			"/vault/one.md": "---\npriority: 2\ntags: [one]\n---\n",
			"/vault/two.md": "---\npriority: 3\naliases: [two]\n---\n",
		})
		const suggestions = await suggestProperties("pri", "/vault")
		expect(suggestions[0]).toMatchObject({
			key: "priority",
			type: "number",
			observed: true,
		})
		expect(suggestions.some((definition) => definition.key === "tags")).toBe(false)
	})

	it("shares one vault scan across simultaneous suggestion queries", async () => {
		const files = Object.fromEntries(
			Array.from({ length: 500 }, (_, index) => [
				`/vault/note-${index}.md`,
				`---\npriority: ${index}\n---\n`,
			]),
		)
		files["/vault/.cortex/schema/properties.json"] = JSON.stringify({
			version: 1,
			properties: [],
		})
		const testRuntime = createTestPropertiesRuntime(files)
		const originalReadNote = testRuntime.runtime.readNote
		let noteReads = 0
		testRuntime.runtime.readNote = async (path) => {
			noteReads++
			return originalReadNote(path)
		}
		invalidatePropertySuggestions("/vault")

		await Promise.all([
			suggestProperties("priority", "/vault"),
			suggestProperties("pri", "/vault"),
			suggestProperties("", "/vault"),
		])

		expect(noteReads).toBe(500)
	})

	it("serializes a rebuild requested during an active suggestion scan", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [],
			}),
			"/vault/note.md": "---\npriority: 1\n---\n",
		})
		let releaseFirstScan: (() => void) | undefined
		const firstScanGate = new Promise<void>((resolve) => {
			releaseFirstScan = resolve
		})
		let scans = 0
		let activeScans = 0
		let maximumActiveScans = 0
		testRuntime.runtime.listMarkdownFiles = async () => {
			scans++
			activeScans++
			maximumActiveScans = Math.max(maximumActiveScans, activeScans)
			if (scans === 1) await firstScanGate
			activeScans--
			return ["/vault/note.md"]
		}
		invalidatePropertySuggestions("/vault")

		const first = suggestProperties("", "/vault")
		await Promise.resolve()
		invalidatePropertySuggestions("/vault")
		const second = suggestProperties("priority", "/vault")
		releaseFirstScan?.()
		await Promise.all([first, second])

		expect(scans).toBe(2)
		expect(maximumActiveScans).toBe(1)
	})
})

describe("author and system metadata", () => {
	it("resolves local and remote author variants", async () => {
		const testRuntime = createTestPropertiesRuntime()
		expect(await resolveAuthorProperty("/vault")).toEqual({ variant: "text" })
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-1",
			members: [{ id: "user-1", label: "Ada" }],
		})
		expect(await resolveAuthorProperty("/vault")).toEqual({
			variant: "person",
			options: [{ id: "user-1", label: "Ada" }],
			currentUserId: "user-1",
		})
	})

	it("initializes defaults and updates edited fields on managed saves", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(systemSchema()),
		})
		const created = await createNoteWithPropertyDefaults("/vault", "Body")
		const createdMeta = (await import("./frontmatter")).parseFrontmatter(created).meta
		expect(createdMeta).toMatchObject({
			workflow: selectProperty.defaultOptionId,
			"note-id": "11111111-1111-4111-8111-111111111111",
			"created-by": "device:test-device",
			"edited-by": "device:test-device",
		})
		testRuntime.runtime.now = () => new Date("2026-06-14T12:00:00.000Z")
		const saved = await prepareNoteForSave("/vault/note.md", created)
		const savedMeta = (await import("./frontmatter")).parseFrontmatter(saved).meta
		expect(savedMeta["note-id"]).toBe("11111111-1111-4111-8111-111111111111")
		expect(savedMeta["created-time"]).toBe("2026-06-13T12:00:00.000Z")
		expect(savedMeta["edited-time"]).toBe("2026-06-14T12:00:00.000Z")
		const duplicate = await prepareDuplicatedNote("/vault", created)
		expect((await import("./frontmatter")).parseFrontmatter(duplicate).meta["created-time"]).toBe(
			"2026-06-14T12:00:00.000Z",
		)
	})

	it("stores remote actors as user IDs", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(systemSchema()),
		})
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-1",
		})
		const created = await createNoteWithPropertyDefaults("/vault")
		expect((await import("./frontmatter")).parseFrontmatter(created).meta["created-by"]).toBe(
			"user-1",
		)
	})

	it("resolves remote metadata and identities without rewriting frontmatter", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(systemSchema()),
			"/vault/note.md":
				"---\ncreated-time: 2025-01-01T00:00:00.000Z\ncreated-by: old-user\nedited-time: 2025-01-02T00:00:00.000Z\nedited-by: old-user\n---\nBody",
		})
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-2",
			members: [{ id: "user-2", label: "Ada", email: "ada@example.com" }],
		})
		testRuntime.runtime.getNoteSourceMetadata = async () => ({
			source: "remote",
			synced: true,
			dirty: false,
			createdAt: "2024-06-01T10:00:00.000Z",
			createdBy: "user-2",
			lastEditedAt: "2026-06-14T11:00:00.000Z",
			lastEditedBy: "device:test-device",
		})

		const resolved = await getResolvedPropertyMap("/vault/note.md")
		expect(resolved["created-time"]).toBe("2024-06-01T10:00:00.000Z")
		expect(resolved["created-by"]).toMatchObject({
			kind: "person",
			label: "Ada",
			current: true,
		})
		expect(resolved["edited-by"]).toMatchObject({
			kind: "device",
			label: "Test device",
			current: true,
		})
		expect((await getPropertyMap("/vault/note.md"))["created-by"]).toBe("old-user")
	})
})

describe("note properties UI state", () => {
	it("defaults to expanded and follows note rename and deletion", async () => {
		const testRuntime = createTestPropertiesRuntime()
		expect(await getNotePropertiesExpanded("/vault", "/vault/one.md")).toBe(true)
		await setNotePropertiesExpanded("/vault", "/vault/one.md", false)
		await renameNotePropertiesUiState("/vault", "/vault/one.md", "/vault/two.md")
		expect(await getNotePropertiesExpanded("/vault", "/vault/two.md")).toBe(false)
		await removeNotePropertiesUiState("/vault", "/vault/two.md")
		expect(await getNotePropertiesExpanded("/vault", "/vault/two.md")).toBe(true)
		expect(testRuntime.atomicWrites).toEqual([
			"/vault/.cortex/ui-state.json",
			"/vault/.cortex/ui-state.json",
			"/vault/.cortex/ui-state.json",
		])
	})
})
