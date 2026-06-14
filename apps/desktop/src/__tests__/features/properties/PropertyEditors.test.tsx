import { noteCache } from "@cortex/core"
import { parseFrontmatter } from "@cortex/properties"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NotePropertiesPanel } from "../../../features/properties/NotePropertiesPanel"
import {
	cleanupPropertyPanelTest,
	initializePanelRuntime,
	notePath,
	renderPanel,
	schemaPath,
	setupPropertyPanelTest,
} from "./propertyPanelTestUtils"

beforeEach(setupPropertyPanelTest)
afterEach(cleanupPropertyPanelTest)

describe("Property value editors", () => {
	it("commits once when Enter closes a text editor before blur", async () => {
		const runtime = initializePanelRuntime(
			{
				version: 1,
				properties: [
					{
						id: "14141414-1414-4414-8414-141414141414",
						key: "project",
						name: "Project",
						type: "text",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
				],
			},
			"---\nproject: Cortex\n---\nBody",
		)
		const writeNote = vi.spyOn(runtime.propertiesRuntime.notes, "writeNote")
		await noteCache.read(notePath)
		const { container } = render(<NotePropertiesPanel filePath={notePath} />)

		await screen.findByText("Cortex")
		await userEvent.click(container.querySelector<HTMLButtonElement>(".note-property-value")!)
		const input = await screen.findByRole("textbox", { name: "Project" })
		await userEvent.clear(input)
		await userEvent.type(input, "Atlas{Enter}")

		await waitFor(() => {
			expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.project).toBe("Atlas")
		})
		expect(writeNote).toHaveBeenCalledTimes(1)
	})

	it("creates select options and stores their stable IDs", async () => {
		const { container, runtime } = await renderPanel(
			{
				version: 1,
				properties: [
					{
						id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
						key: "role",
						name: "Role",
						type: "select",
						createdAt: "2026-06-13T00:00:00.000Z",
						options: [],
						optionSort: "manual",
					},
				],
			},
			"Body",
		)
		await screen.findByText("Empty")
		await userEvent.click(container.querySelector<HTMLButtonElement>(".note-property-value")!)
		await userEvent.type(
			await screen.findByPlaceholderText("Select an option or create one"),
			"Reviewer",
		)
		await userEvent.click(screen.getByText("Create “Reviewer”"))

		await waitFor(() => {
			const schema = JSON.parse(runtime.files.get(schemaPath) ?? "{}")
			const option = schema.properties[0].options?.[0]
			expect(option).toMatchObject({ label: "Reviewer" })
			expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.role).toBe(option?.id)
		})
	})

	it("renders orphaned options and remote people without rewriting values", async () => {
		const runtime = initializePanelRuntime(
			{
				version: 1,
				properties: [
					{
						id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
						key: "workflow",
						name: "Workflow",
						type: "select",
						createdAt: "2026-06-13T00:00:00.000Z",
						options: [
							{
								id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
								label: "Done",
								color: "green",
							},
						],
					},
					{
						id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
						key: "author",
						name: "Author",
						type: "text",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
				],
			},
			"---\nworkflow: orphaned\nauthor: user-1\n---\nBody",
		)
		Object.assign(runtime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote-vault",
			currentUserId: "user-1",
			members: [{ id: "user-1", label: "Ada", email: "ada@example.com" }],
		})
		await noteCache.read(notePath)
		const { container } = render(<NotePropertiesPanel filePath={notePath} />)

		expect(await screen.findByText("Unknown")).toBeInTheDocument()
		expect(await screen.findByText("Ada")).toBeInTheDocument()
		const authorRow = Array.from(container.querySelectorAll(".note-property-row")).find((row) =>
			row.textContent?.includes("Author"),
		)
		await userEvent.click(authorRow!.querySelector<HTMLButtonElement>(".note-property-value")!)
		expect(await screen.findByPlaceholderText("Search for people...")).toBeInTheDocument()
		expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.workflow).toBe("orphaned")
	})

	it("renders system actors through the shared identity model", async () => {
		const runtime = initializePanelRuntime(
			{
				version: 1,
				properties: [
					{
						id: "12121212-1212-4212-8212-121212121212",
						key: "created-by",
						name: "Created by",
						type: "created_by",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
					{
						id: "13131313-1313-4313-8313-131313131313",
						key: "edited-by",
						name: "Edited by",
						type: "last_edited_by",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
				],
			},
			"---\ncreated-by: user-1\nedited-by: device:desktop-test\n---\nBody",
		)
		Object.assign(runtime.authorContext, {
			authenticated: true,
			remoteVaultId: "remote-vault",
			currentUserId: "user-1",
			members: [{ id: "user-1", label: "Ada", email: "ada@example.com" }],
		})
		await noteCache.read(notePath)
		render(<NotePropertiesPanel filePath={notePath} />)

		expect(await screen.findByText("Ada")).toBeInTheDocument()
		expect(await screen.findByText("Test device")).toBeInTheDocument()
		expect(screen.queryByText("user-1")).not.toBeInTheDocument()
		expect(screen.queryByText("device:desktop-test")).not.toBeInTheDocument()
	})
})
