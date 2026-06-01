import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useUIStore: vi.fn(),
	useVaultStore: vi.fn(),
	useWorkspaceStore: vi.fn(),
}))

vi.mock("@cortex/search", () => ({
	useSearchStore: vi.fn(),
}))

import { useUIStore, useVaultStore, useWorkspaceStore } from "@cortex/core"
import { useSearchStore } from "@cortex/search"
import { QuickFinder } from "../../../features/quick-finder/QuickFinder"

const toggleQuickFinder = vi.fn()
const createFile = vi.fn().mockResolvedValue("/vault/New Note.md")
const openTab = vi.fn()
const searchTitles = vi.fn()

const vault = {
	path: "/vault",
	name: "Test Vault",
	uuid: "vault-id",
}

function setupQuickFinder({
	recentlyClosed = [],
	searchResults = [],
}: {
	recentlyClosed?: Array<{ filePath: string; title: string; closedAt: number }>
	searchResults?: Array<{ id: string; title: string; folder: string }>
} = {}) {
	searchTitles.mockReturnValue(searchResults)

	vi.mocked(useUIStore).mockReturnValue({
		quickFinderOpen: true,
		toggleQuickFinder,
	} as never)

	vi.mocked(useVaultStore).mockReturnValue({
		vault,
		createFile,
	} as never)

	vi.mocked(useWorkspaceStore).mockReturnValue({
		activePaneId: "root",
		openTab,
		panes: {
			root: {
				id: "root",
				activeTabId: "tab-1",
				tabs: [
					{
						id: "tab-1",
						tabType: "file",
						filePath: "/vault/Journal/Daily.md",
						title: "Daily",
						lastAccessed: 20,
					},
					{
						id: "tab-2",
						tabType: "file",
						filePath: "/vault/Projects/Roadmap.md",
						title: "Roadmap",
						lastAccessed: 10,
					},
				],
			},
		},
		recentlyClosed,
	} as never)

	vi.mocked(useSearchStore).mockReturnValue({
		searchTitles,
	} as never)
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	createFile.mockResolvedValue("/vault/New Note.md")
})

describe("QuickFinder", () => {
	it("shows recent notes before searching", () => {
		setupQuickFinder({
			recentlyClosed: [{ filePath: "/vault/Archive/Closed.md", title: "Closed", closedAt: 1 }],
		})

		render(<QuickFinder />)

		expect(screen.getByText("Daily")).toBeInTheDocument()
		expect(screen.getByText("Journal")).toBeInTheDocument()
		expect(screen.getByText("Closed")).toBeInTheDocument()
		expect(screen.getByText("Archive")).toBeInTheDocument()
	})

	it("opens a searched note", async () => {
		setupQuickFinder({
			searchResults: [{ id: "Projects/Plan.md", title: "Plan", folder: "Projects" }],
		})
		render(<QuickFinder />)

		await userEvent.type(screen.getByPlaceholderText("Search notes..."), "plan")
		await userEvent.click(screen.getByText("Plan"))

		expect(openTab).toHaveBeenCalledWith("/vault/Projects/Plan.md", undefined)
		expect(toggleQuickFinder).toHaveBeenCalled()
	})

	it("opens the selected note in the active pane with Command Enter", async () => {
		setupQuickFinder({
			searchResults: [{ id: "Projects/Plan.md", title: "Plan", folder: "Projects" }],
		})
		render(<QuickFinder />)

		const input = screen.getByPlaceholderText("Search notes...")
		await userEvent.type(input, "plan")
		fireEvent.keyDown(input, { key: "Enter", metaKey: true })

		expect(openTab).toHaveBeenCalledWith("/vault/Projects/Plan.md", { paneId: "root" })
		expect(toggleQuickFinder).toHaveBeenCalled()
	})

	it("opens the selected note in a split with Control Shift Enter", async () => {
		setupQuickFinder({
			searchResults: [{ id: "Projects/Plan.md", title: "Plan", folder: "Projects" }],
		})
		render(<QuickFinder />)

		const input = screen.getByPlaceholderText("Search notes...")
		await userEvent.type(input, "plan")
		fireEvent.keyDown(input, { key: "Enter", ctrlKey: true, shiftKey: true })

		expect(openTab).toHaveBeenCalledWith("/vault/Projects/Plan.md", {
			paneId: "root",
			split: "horizontal",
		})
		expect(toggleQuickFinder).toHaveBeenCalled()
	})

	it("creates a note from the selectable create item", async () => {
		setupQuickFinder()
		render(<QuickFinder />)

		await userEvent.type(screen.getByPlaceholderText("Search notes..."), "New Note")
		await userEvent.click(screen.getByText('Create "New Note"'))

		await waitFor(() => {
			expect(createFile).toHaveBeenCalledWith("/vault", "New Note")
		})
		expect(openTab).toHaveBeenCalledWith("/vault/New Note.md")
		expect(toggleQuickFinder).toHaveBeenCalled()
	})

	it("creates a note with Shift Enter", async () => {
		setupQuickFinder()
		render(<QuickFinder />)

		const input = screen.getByPlaceholderText("Search notes...")
		await userEvent.type(input, "Alias Note")
		fireEvent.keyDown(input, { key: "Enter", shiftKey: true })

		await waitFor(() => {
			expect(createFile).toHaveBeenCalledWith("/vault", "Alias Note")
		})
		expect(openTab).toHaveBeenCalledWith("/vault/New Note.md")
		expect(toggleQuickFinder).toHaveBeenCalled()
	})
})
