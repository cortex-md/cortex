import { createTestPropertiesRuntime } from "./__tests__/fixtures/runtime"
import {
	getNotePropertiesExpanded,
	removeNotePropertiesUiState,
	renameNotePropertiesUiState,
	setNotePropertiesExpanded,
} from "./uiState"

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
