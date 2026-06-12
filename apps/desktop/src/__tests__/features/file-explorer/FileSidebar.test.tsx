import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../features/sync/NoteHistoryPanel", () => ({
	NoteHistoryPanel: () => null,
}))

import { useDragStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { FileSidebar } from "../../../features/file-explorer/FileSidebar"

const ROOT_PANE_ID = "root"

function resetWorkspace() {
	useWorkspaceStore.setState({
		panes: {
			[ROOT_PANE_ID]: { id: ROOT_PANE_ID, tabs: [], activeTabId: null },
		},
		splitTree: { type: "leaf", id: ROOT_PANE_ID },
		activePaneId: ROOT_PANE_ID,
		mruOrder: [],
		recentlyClosed: [],
	})
}

function renderFileSidebar() {
	useVaultStore.setState({
		vault: {
			uuid: "vault",
			path: "/vault",
			name: "Vault",
			fileCount: 2,
		},
		files: [
			{ path: "/vault/Folder", name: "Folder", isDir: true },
			{ path: "/vault/Note.md", name: "Note.md", isDir: false },
		],
	})

	render(<FileSidebar />)
}

beforeEach(() => {
	resetWorkspace()
	useDragStore.setState({ dragSource: null, dropTarget: null })
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("FileSidebar drag behavior", () => {
	it("starts a file drag after pointer movement on note rows", () => {
		renderFileSidebar()
		const note = screen.getByRole("treeitem", { name: "Note" })

		expect(note).toHaveAttribute("draggable", "false")
		fireEvent.pointerDown(note, { button: 0, clientX: 0, clientY: 0, isPrimary: true })
		fireEvent.pointerMove(document, { clientX: 8, clientY: 0, isPrimary: true })

		expect(useDragStore.getState().dragSource).toEqual({
			type: "file",
			filePath: "/vault/Note.md",
		})

		fireEvent.pointerCancel(document, { isPrimary: true })
		expect(useDragStore.getState().dragSource).toBeNull()
	})

	it("does not mark folder rows as draggable", () => {
		renderFileSidebar()

		expect(screen.getByRole("treeitem", { name: "Folder" })).toHaveAttribute("draggable", "false")
	})

	it("disables drag while a note is being renamed", () => {
		renderFileSidebar()
		const note = screen.getByRole("treeitem", { name: "Note" })

		fireEvent.keyDown(note, { key: "F2" })

		expect(screen.getByDisplayValue("Note.md")).toBeInTheDocument()
		expect(note).toHaveAttribute("draggable", "false")
	})
})
