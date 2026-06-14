import { noteCache } from "@cortex/core"
import { parseFrontmatter, type VaultSchema } from "@cortex/properties"
import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NotePropertiesPanel } from "../../../features/properties/NotePropertiesPanel"
import { useNotePropertiesPanel } from "../../../features/properties/useNotePropertiesPanel"
import {
	cleanupPropertyPanelTest,
	initializePanelRuntime,
	notePath,
	renderPanel,
	schemaPath,
	setupPropertyPanelTest,
	uiStatePath,
} from "./propertyPanelTestUtils"

beforeEach(setupPropertyPanelTest)
afterEach(cleanupPropertyPanelTest)

describe("NotePropertiesPanel shell", () => {
	it("does not scan the vault while rendering a note", async () => {
		const runtime = initializePanelRuntime(
			{ version: 1, properties: [] },
			"---\npriority: 3\n---\nBody",
		)
		const listMarkdownFiles = vi
			.fn()
			.mockResolvedValue(Array.from({ length: 500 }, (_, index) => `/vault/note-${index}.md`))
		runtime.propertiesRuntime.notes.listMarkdownFiles = listMarkdownFiles
		await noteCache.read(notePath)

		render(<NotePropertiesPanel filePath={notePath} />)

		await screen.findByRole("button", { name: "Add a property" })
		expect(listMarkdownFiles).not.toHaveBeenCalled()
	})

	it("persists expansion state", async () => {
		const { runtime } = await renderPanel(
			{ version: 1, properties: [] },
			"---\npriority: 3\n---\nBody",
		)

		await userEvent.click(await screen.findByRole("button", { name: "Properties" }))
		await waitFor(() => {
			expect(JSON.parse(runtime.files.get(uiStatePath) ?? "{}").expanded["note.md"]).toBe(false)
		})
	})

	it("ignores a stale snapshot after switching notes", async () => {
		const slowPath = "/vault/slow.md"
		const fastPath = "/vault/fast.md"
		const runtime = initializePanelRuntime({ version: 1, properties: [] }, "Body")
		runtime.files.set(slowPath, "---\nproject: Slow\n---\nBody")
		runtime.files.set(fastPath, "---\nproject: Fast\n---\nBody")
		const originalReadNote = runtime.propertiesRuntime.notes.readNote
		let releaseSlowRead: (() => void) | undefined
		const slowRead = new Promise<void>((resolve) => {
			releaseSlowRead = resolve
		})
		runtime.propertiesRuntime.notes.readNote = async (path) => {
			if (path === slowPath) await slowRead
			return originalReadNote(path)
		}

		const { result, rerender } = renderHook(({ filePath }) => useNotePropertiesPanel(filePath), {
			initialProps: { filePath: slowPath },
		})
		rerender({ filePath: fastPath })

		await waitFor(() => expect(result.current.meta.project).toBe("Fast"))
		await act(async () => {
			releaseSlowRead?.()
			await slowRead
		})
		expect(result.current.meta.project).toBe("Fast")
	})

	it("disables mutations until malformed YAML is fixed", async () => {
		const schema: VaultSchema = {
			version: 1,
			properties: [
				{
					id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
					key: "project",
					name: "Project",
					type: "text",
					createdAt: "2026-06-13T00:00:00.000Z",
				},
			],
		}
		const { container, runtime } = await renderPanel(schema, "---\nbroken: [\n---\nBody")

		expect(
			await screen.findByText(/Properties are read-only until the YAML frontmatter is fixed/),
		).toBeInTheDocument()
		expect(container.querySelector(".note-properties-content")).toHaveAttribute(
			"aria-disabled",
			"true",
		)

		runtime.files.set(notePath, "---\nproject: Cortex\n---\nBody")
		noteCache.writeExternal(notePath, runtime.files.get(notePath)!)
		await waitFor(() =>
			expect(container.querySelector(".note-properties-content")).toHaveAttribute(
				"aria-disabled",
				"false",
			),
		)
		expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.project).toBe("Cortex")
		expect(JSON.parse(runtime.files.get(schemaPath) ?? "{}")).toEqual(schema)
	})
})
