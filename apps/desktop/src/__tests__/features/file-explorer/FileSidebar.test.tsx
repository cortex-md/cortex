import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../features/sync/NoteHistoryPanel", () => ({
	NoteHistoryPanel: () => null,
}))

import { useDragStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import {
	FILE_TREE_ROW_HEIGHT,
	FILE_TREE_ROW_STEP,
	FileSidebar,
	getFileTreeDepthStyle,
} from "../../../features/file-explorer/FileSidebar"

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
			fileCount: 3,
		},
		files: [
			{ path: "/vault/Folder", name: "Folder", isDir: true },
			{ path: "/vault/Folder/Nested.md", name: "Nested.md", isDir: false },
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

describe("FileSidebar layout", () => {
	it("uses a thirty-six pixel virtual step around thirty-two pixel rows", () => {
		expect(FILE_TREE_ROW_HEIGHT).toBe(32)
		expect(FILE_TREE_ROW_STEP).toBe(36)
		expect(getFileTreeDepthStyle(2)).toEqual({
			"--file-tree-depth": 2,
			"--file-tree-guide-width": "36px",
			"--file-tree-indent": "46px",
			"--file-tree-row-height": "32px",
		})
	})

	it("passes nested depth through typed CSS properties", () => {
		renderFileSidebar()
		fireEvent.click(screen.getByRole("treeitem", { name: "Folder" }))

		const nestedRow = screen.getByRole("treeitem", { name: "Nested" }).closest(".file-tree-row")

		expect(nestedRow).not.toBeNull()
		expect((nestedRow as HTMLElement).style.getPropertyValue("--file-tree-depth")).toBe("1")
		expect((nestedRow as HTMLElement).style.getPropertyValue("--file-tree-guide-width")).toBe(
			"18px",
		)
		expect((nestedRow as HTMLElement).style.height).toBe("36px")
	})

	it("uses the same depth contract for inline creation rows", () => {
		renderFileSidebar()
		fireEvent.click(screen.getByRole("button", { name: "New Folder" }))

		const createInput = screen.getByDisplayValue("New Folder")
		const createRow = createInput.closest(".file-tree-row")

		expect(createRow).not.toBeNull()
		expect((createRow as HTMLElement).style.getPropertyValue("--file-tree-depth")).toBe("0")
		expect(createInput.closest(".file-tree-create-row")).not.toBeNull()
	})
})
