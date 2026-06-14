import { createSystemSchema, selectProperty } from "./__tests__/fixtures/definitions"
import { createTestPropertiesRuntime } from "./__tests__/fixtures/runtime"
import { parseFrontmatter } from "./frontmatter"
import { createNoteWithPropertyDefaults, prepareDuplicatedNote, prepareNoteForSave } from "./system"

describe("system property metadata", () => {
	it("initializes defaults and updates edited fields on managed saves", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(createSystemSchema()),
		})
		const created = await createNoteWithPropertyDefaults("/vault", "Body")
		const createdMeta = parseFrontmatter(created).meta
		expect(createdMeta).toMatchObject({
			workflow: selectProperty.defaultOptionId,
			"note-id": "11111111-1111-4111-8111-111111111111",
			"created-by": "device:test-device",
			"edited-by": "device:test-device",
		})
		testRuntime.runtime.now = () => new Date("2026-06-14T12:00:00.000Z")
		const saved = await prepareNoteForSave("/vault/note.md", created)
		const savedMeta = parseFrontmatter(saved).meta
		expect(savedMeta["note-id"]).toBe("11111111-1111-4111-8111-111111111111")
		expect(savedMeta["created-time"]).toBe("2026-06-13T12:00:00.000Z")
		expect(savedMeta["edited-time"]).toBe("2026-06-14T12:00:00.000Z")
		const duplicate = await prepareDuplicatedNote("/vault", created)
		expect(parseFrontmatter(duplicate).meta["created-time"]).toBe("2026-06-14T12:00:00.000Z")
	})

	it("never changes initialized creation fields or IDs", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(createSystemSchema()),
		})
		const raw =
			"---\nnote-id: stable-id\ncreated-time: 2020-01-01T00:00:00.000Z\ncreated-by: original-user\n---\nBody"
		testRuntime.runtime.now = () => new Date("2026-06-14T12:00:00.000Z")

		const saved = await prepareNoteForSave("/vault/note.md", raw)
		expect(parseFrontmatter(saved).meta).toMatchObject({
			"note-id": "stable-id",
			"created-time": "2020-01-01T00:00:00.000Z",
			"created-by": "original-user",
		})
	})

	it("stores remote actors as user IDs", async () => {
		const testRuntime = createTestPropertiesRuntime({
			"/vault/.cortex/schema/properties.json": JSON.stringify(createSystemSchema()),
		})
		Object.assign(testRuntime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote",
			currentUserId: "user-1",
		})
		const created = await createNoteWithPropertyDefaults("/vault")
		expect(parseFrontmatter(created).meta["created-by"]).toBe("user-1")
	})
})
