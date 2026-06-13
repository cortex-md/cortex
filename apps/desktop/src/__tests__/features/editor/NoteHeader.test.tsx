import { useVaultStore } from "@cortex/core"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { NoteHeader } from "../../../features/split-view/NoteHeader"

const renameFile = vi.fn().mockResolvedValue("/vault/folder/Renamed.md")

beforeEach(() => {
	renameFile.mockClear()
	useVaultStore.setState({
		vault: {
			uuid: "vault-id",
			path: "/vault",
			name: "My Vault",
			fileCount: 1,
		},
		renameFile,
	})
})

describe("NoteHeader", () => {
	it("shows the note-relative path without the vault name or markdown extension", () => {
		render(<NoteHeader filePath="/vault/folder/Current.md" />)

		expect(screen.queryByText("My Vault")).not.toBeInTheDocument()
		expect(screen.getByText("folder")).toBeInTheDocument()
		expect(screen.getByText("Current")).toBeInTheDocument()
		expect(screen.queryByText("Current.md")).not.toBeInTheDocument()
		expect(screen.getByRole("textbox", { name: "Note title" })).toHaveValue("Current")
	})

	it("renames the note on Enter while preserving the markdown extension", async () => {
		const user = userEvent.setup()
		render(<NoteHeader filePath="/vault/folder/Current.md" />)
		const title = screen.getByRole("textbox", { name: "Note title" })

		await user.clear(title)
		await user.type(title, "Renamed{Enter}")

		await waitFor(() => {
			expect(renameFile).toHaveBeenCalledWith("/vault/folder/Current.md", "Renamed.md")
		})
	})

	it("restores the current title on Escape", () => {
		render(<NoteHeader filePath="/vault/folder/Current.md" />)
		const title = screen.getByRole("textbox", { name: "Note title" })

		fireEvent.change(title, { target: { value: "Draft" } })
		fireEvent.keyDown(title, { key: "Escape" })

		expect(title).toHaveValue("Current")
		expect(renameFile).not.toHaveBeenCalled()
	})

	it("marks invalid titles using the input invalid state", () => {
		render(<NoteHeader filePath="/vault/folder/Current.md" />)
		const title = screen.getByRole("textbox", { name: "Note title" })

		fireEvent.change(title, { target: { value: "invalid/name" } })

		expect(title).toHaveAttribute("aria-invalid", "true")
		expect(screen.getByText(/not supported/i)).toBeInTheDocument()
	})
})
