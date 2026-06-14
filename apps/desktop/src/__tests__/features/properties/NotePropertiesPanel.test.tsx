import { noteCache, useVaultStore } from "@cortex/core"
import {
	initializeProperties,
	invalidatePropertySuggestions,
	type PropertiesRuntime,
	type PropertyAuthorContext,
	parseFrontmatter,
	type VaultSchema,
} from "@cortex/properties"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NotePropertiesPanel } from "../../../features/properties/NotePropertiesPanel"

const vaultPath = "/vault"
const notePath = "/vault/note.md"
const schemaPath = "/vault/.cortex/schema/properties.json"
const uiStatePath = "/vault/.cortex/ui-state.json"

interface PanelTestRuntime {
	files: Map<string, string>
	authorContext: PropertyAuthorContext
	propertiesRuntime: PropertiesRuntime
}

function initializePanelRuntime(schema: VaultSchema, note: string): PanelTestRuntime {
	const files = new Map<string, string>([
		[schemaPath, JSON.stringify(schema)],
		[notePath, note],
	])
	const authorContext: PropertyAuthorContext = {
		authenticated: false,
		remoteVaultId: null,
		currentUserId: null,
		members: [],
		currentDeviceId: "desktop-test",
		devices: [{ id: "desktop-test", label: "Test device", current: true }],
	}
	const read = async (path: string) => {
		const content = files.get(path)
		if (content === undefined) throw new Error(`No such file: ${path}`)
		return content
	}
	const runtime: PropertiesRuntime = {
		readFile: read,
		writeFile: async (path, content) => {
			files.set(path, content)
		},
		atomicWriteFile: async (path, content) => {
			files.set(path, content)
		},
		readNote: read,
		writeNote: async (path, content) => {
			files.set(path, content)
			noteCache.writeExternal(path, content)
		},
		resolveVaultPath: (filePath) => (filePath.startsWith(`${vaultPath}/`) ? vaultPath : null),
		listMarkdownFiles: async () => [notePath],
		getAuthorContext: async () => authorContext,
		getNoteSourceMetadata: async () => ({
			source: "local",
			synced: false,
			dirty: false,
			createdAt: "2026-06-13T00:00:00.000Z",
			lastEditedAt: "2026-06-13T00:00:00.000Z",
		}),
		getDeviceId: async () => "desktop-test",
	}
	initializeProperties(runtime)
	invalidatePropertySuggestions()
	return { files, authorContext, propertiesRuntime: runtime }
}

async function renderPanel(schema: VaultSchema, note: string) {
	const runtime = initializePanelRuntime(schema, note)
	await noteCache.read(notePath)
	const rendered = render(<NotePropertiesPanel filePath={notePath} />)
	return { ...rendered, runtime }
}

beforeEach(() => {
	noteCache.clear()
	useVaultStore.setState({
		vault: {
			uuid: "vault-id",
			path: vaultPath,
			name: "Vault",
			fileCount: 1,
		},
	})
})

afterEach(() => {
	cleanup()
	noteCache.clear()
})

describe("NotePropertiesPanel", () => {
	it("does not scan the vault while rendering a note", async () => {
		const runtime = initializePanelRuntime(
			{ version: 1, properties: [] },
			"---\npriority: 3\n---\nBody",
		)
		const listMarkdownFiles = vi
			.fn()
			.mockResolvedValue(Array.from({ length: 500 }, (_, index) => `/vault/note-${index}.md`))
		runtime.propertiesRuntime.listMarkdownFiles = listMarkdownFiles
		await noteCache.read(notePath)

		render(<NotePropertiesPanel filePath={notePath} />)

		await screen.findByRole("button", { name: "Add a property" })
		expect(listMarkdownFiles).not.toHaveBeenCalled()
	})

	it("edits a value in a popover and creates a typed property", async () => {
		const { container, runtime } = await renderPanel(
			{
				version: 1,
				properties: [
					{
						id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						key: "project",
						name: "Project",
						type: "text",
						createdAt: "2026-06-13T00:00:00.000Z",
					},
				],
			},
			"---\nproject: Cortex\n---\nBody",
		)

		await screen.findByText("Cortex")
		const valueButton = container.querySelector<HTMLButtonElement>(".note-property-value")
		expect(valueButton).not.toBeNull()
		await userEvent.click(valueButton!)
		const projectInput = await screen.findByRole("textbox", { name: "Project" })
		await userEvent.clear(projectInput)
		await userEvent.type(projectInput, "Atlas")
		await userEvent.tab()

		await waitFor(() => {
			expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.project).toBe("Atlas")
		})

		await userEvent.click(screen.getByRole("button", { name: "Add a property" }))
		await userEvent.type(
			await screen.findByPlaceholderText("Search or name a property..."),
			"Priority",
		)
		await userEvent.click(screen.getByText("Number"))

		await waitFor(() => {
			const schema = JSON.parse(runtime.files.get(schemaPath) ?? "{}") as VaultSchema
			expect(schema.properties).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ key: "priority", name: "Priority", type: "number" }),
				]),
			)
		})
	})

	it("registers observed YAML keys and persists expansion state", async () => {
		const { runtime } = await renderPanel(
			{ version: 1, properties: [] },
			"---\npriority: 3\ntags: [work]\n---\nBody",
		)

		await waitFor(() => {
			expect(screen.getByRole("button", { name: "Add a property" })).toBeInTheDocument()
		})
		await userEvent.click(screen.getByRole("button", { name: "Add a property" }))
		const observedOption = await screen.findByText("Priority")
		await userEvent.click(observedOption)

		await waitFor(() => {
			const schema = JSON.parse(runtime.files.get(schemaPath) ?? "{}") as VaultSchema
			expect(schema.properties[0]).toMatchObject({ key: "priority", type: "number" })
		})

		await userEvent.click(screen.getByRole("button", { name: "Properties" }))
		await waitFor(() => {
			expect(JSON.parse(runtime.files.get(uiStatePath) ?? "{}").expanded["note.md"]).toBe(false)
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
		const authorValue = authorRow?.querySelector<HTMLButtonElement>(".note-property-value")
		expect(authorValue).not.toBeNull()
		await userEvent.click(authorValue!)
		expect(await screen.findByPlaceholderText("Search for people...")).toBeInTheDocument()
		expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.workflow).toBe("orphaned")
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
			const schema = JSON.parse(runtime.files.get(schemaPath) ?? "{}") as VaultSchema
			const option = schema.properties[0].options?.[0]
			expect(option).toMatchObject({ label: "Reviewer" })
			expect(parseFrontmatter(runtime.files.get(notePath) ?? "").meta.role).toBe(option?.id)
		})
	})

	it("renders system actors through the shared person and device identity model", async () => {
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

	it("duplicates definitions and blocks mutations for malformed YAML", async () => {
		const { container, runtime } = await renderPanel(
			{
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
			},
			"---\nbroken: [\n---\nBody",
		)

		expect(
			await screen.findByText(/Properties are read-only until the YAML frontmatter is fixed/),
		).toBeInTheDocument()
		expect(container.querySelector(".note-properties-content")).toHaveAttribute(
			"aria-disabled",
			"true",
		)

		runtime.files.set(notePath, "---\nproject: Cortex\n---\nBody")
		noteCache.writeExternal(notePath, runtime.files.get(notePath)!)
		await waitFor(() => {
			expect(container.querySelector(".note-properties-content")).toHaveAttribute(
				"aria-disabled",
				"false",
			)
		})
		const propertyName = container.querySelector<HTMLButtonElement>(".note-property-name")
		await userEvent.click(propertyName!)
		expect(container.querySelector(".note-property-drag-handle")).toBeNull()
		expect(container.querySelector(".note-property-name-help")).toBeNull()
		await userEvent.click(await screen.findByRole("button", { name: "Duplicate property" }))
		await waitFor(() => {
			const schema = JSON.parse(runtime.files.get(schemaPath) ?? "{}") as VaultSchema
			expect(schema.properties.map((property) => property.name)).toEqual([
				"Project",
				"Project copy",
			])
		})
	})
})
