import { createSystemSchema, selectProperty } from "./__tests__/fixtures/definitions"
import { createTestPropertiesRuntime } from "./__tests__/fixtures/runtime"
import { resolveAuthorConfig } from "./actors"
import { getPropertyMap, loadNotePropertiesSnapshot, setProperty } from "./noteStore"
import { getPropertyType } from "./registry"
import { updateVaultSchema } from "./schemaStore"

describe("note property store", () => {
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

	it("reads note, schema, metadata, and identity once for each snapshot", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify({
				version: 1,
				properties: [selectProperty],
			}),
			"/vault/note.md": "---\nworkflow: value\npriority: 2\n---\nBody",
		})
		const readNote = vi.spyOn(testRuntime.runtime.notes, "readNote")
		const readFile = vi.spyOn(testRuntime.runtime.files, "readFile")
		const getMetadata = vi.spyOn(testRuntime.runtime.metadata, "getNoteSourceMetadata")
		const getIdentity = vi.spyOn(testRuntime.runtime.identity, "getAuthorContext")

		const snapshot = await loadNotePropertiesSnapshot("/vault/note.md")

		expect(snapshot.persistedMeta).toMatchObject({ workflow: "value", priority: 2 })
		expect(snapshot.observedDefinitions).toEqual([
			expect.objectContaining({ key: "priority", type: "number" }),
		])
		expect(readNote).toHaveBeenCalledTimes(1)
		expect(readFile).toHaveBeenCalledTimes(1)
		expect(getMetadata).toHaveBeenCalledTimes(1)
		expect(getIdentity).toHaveBeenCalledTimes(1)
	})

	it("resolves local and remote author variants", () => {
		const testRuntime = createTestPropertiesRuntime()
		expect(resolveAuthorConfig(testRuntime.authorContext)).toEqual({ variant: "text" })
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-1",
			members: [{ id: "user-1", label: "Ada" }],
		})
		expect(resolveAuthorConfig(testRuntime.authorContext)).toEqual({
			variant: "person",
			options: [{ id: "user-1", label: "Ada" }],
			currentUserId: "user-1",
		})
	})

	it("resolves remote metadata and identities without rewriting frontmatter", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(createSystemSchema()),
			"/vault/note.md":
				"---\ncreated-time: 2025-01-01T00:00:00.000Z\ncreated-by: old-user\nedited-time: 2025-01-02T00:00:00.000Z\nedited-by: old-user\n---\nBody",
		})
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-2",
			members: [{ id: "user-2", label: "Ada", email: "ada@example.com" }],
		})
		testRuntime.runtime.metadata.getNoteSourceMetadata = async () => ({
			source: "remote",
			synced: true,
			dirty: false,
			createdAt: "2024-06-01T10:00:00.000Z",
			createdBy: "user-2",
			lastEditedAt: "2026-06-14T11:00:00.000Z",
			lastEditedBy: "device:test-device",
		})

		const snapshot = await loadNotePropertiesSnapshot("/vault/note.md")
		expect(snapshot.resolvedMeta["created-time"]).toBe("2024-06-01T10:00:00.000Z")
		expect(snapshot.resolvedMeta["created-by"]).toMatchObject({
			kind: "person",
			label: "Ada",
			current: true,
		})
		expect(snapshot.resolvedMeta["edited-by"]).toMatchObject({
			kind: "device",
			label: "Test device",
			current: true,
		})
		expect((await getPropertyMap("/vault/note.md"))["created-by"]).toBe("old-user")
	})
})
