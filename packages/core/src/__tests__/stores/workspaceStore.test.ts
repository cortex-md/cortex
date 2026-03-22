import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { noteCache } from "../../noteCache"
import { useWorkspaceStore } from "../../stores/workspaceStore"

const ROOT_PANE_ID = "root"

function buildInitial() {
	return {
		panes: {
			[ROOT_PANE_ID]: { id: ROOT_PANE_ID, tabs: [], activeTabId: null },
		},
		splitTree: { type: "leaf" as const, id: ROOT_PANE_ID },
		activePaneId: ROOT_PANE_ID,
		mruOrder: [],
		recentlyClosed: [],
	}
}

beforeEach(() => {
	useWorkspaceStore.setState(buildInitial())
	vi.spyOn(noteCache, "openTab").mockImplementation(() => {})
	vi.spyOn(noteCache, "closeTab").mockResolvedValue()
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("openTab()", () => {
	it("creates a new tab in the active pane", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs).toHaveLength(1)
		expect(pane.tabs[0].filePath).toBe("/vault/note.md")
	})

	it("sets the new tab as active", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const { panes } = useWorkspaceStore.getState()
		const pane = panes[ROOT_PANE_ID]
		expect(pane.activeTabId).toBe(pane.tabs[0].id)
	})

	it("does not create duplicate tabs for same file", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs).toHaveLength(1)
	})

	it("activates existing tab when file is already open", () => {
		useWorkspaceStore.getState().openTab("/vault/first.md")
		useWorkspaceStore.getState().openTab("/vault/second.md")
		useWorkspaceStore.getState().openTab("/vault/first.md")
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.activeTabId).toBe(pane.tabs.find((t) => t.filePath === "/vault/first.md")?.id)
	})

	it("calls noteCache.openTab with the file path", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		expect(noteCache.openTab).toHaveBeenCalledWith("/vault/note.md")
	})

	it("derives tab title from file name without extension", () => {
		useWorkspaceStore.getState().openTab("/vault/my-note.md")
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs[0].title).toBe("my-note")
	})

	it("adds tab id to mruOrder", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const { mruOrder, panes } = useWorkspaceStore.getState()
		const tabId = panes[ROOT_PANE_ID].tabs[0].id
		expect(mruOrder).toContain(tabId)
	})
})

describe("closeTab()", () => {
	function openAndGetTab(filePath: string) {
		useWorkspaceStore.getState().openTab(filePath)
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		return pane.tabs.find((t) => t.filePath === filePath)!
	}

	it("removes the tab from the pane", () => {
		const tab = openAndGetTab("/vault/note.md")
		useWorkspaceStore.getState().closeTab(tab.id, ROOT_PANE_ID)
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs).toHaveLength(0)
	})

	it("removes tab id from mruOrder", () => {
		const tab = openAndGetTab("/vault/note.md")
		useWorkspaceStore.getState().closeTab(tab.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().mruOrder).not.toContain(tab.id)
	})

	it("adds closed file to recentlyClosed", () => {
		const tab = openAndGetTab("/vault/note.md")
		useWorkspaceStore.getState().closeTab(tab.id, ROOT_PANE_ID)
		const { recentlyClosed } = useWorkspaceStore.getState()
		expect(recentlyClosed[0]?.filePath).toBe("/vault/note.md")
	})

	it("does not close pinned tabs", () => {
		const tab = openAndGetTab("/vault/pinned.md")
		useWorkspaceStore.getState().pinTab(tab.id, ROOT_PANE_ID)
		useWorkspaceStore.getState().closeTab(tab.id, ROOT_PANE_ID)
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs).toHaveLength(1)
	})

	it("is a no-op when pane does not exist", () => {
		expect(() =>
			useWorkspaceStore.getState().closeTab("nonexistent", "nonexistent-pane"),
		).not.toThrow()
	})
})

describe("splitPane()", () => {
	it("creates a split node replacing the original leaf", () => {
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const { splitTree } = useWorkspaceStore.getState()
		expect(splitTree.type).toBe("split")
	})

	it("creates two panes after split", () => {
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const { panes } = useWorkspaceStore.getState()
		expect(Object.keys(panes)).toHaveLength(2)
	})

	it("sets activePaneId to the new pane after split", () => {
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "vertical")
		const { activePaneId, panes } = useWorkspaceStore.getState()
		expect(activePaneId).not.toBe(ROOT_PANE_ID)
		expect(panes[activePaneId]).toBeDefined()
	})

	it("uses equal 50/50 sizes for split children", () => {
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const { splitTree } = useWorkspaceStore.getState()
		if (splitTree.type === "split") {
			expect(splitTree.sizes).toEqual([50, 50])
		}
	})
})

describe("closePane()", () => {
	it("removes pane and collapses split when only one child remains", () => {
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const newPaneId = useWorkspaceStore.getState().activePaneId
		useWorkspaceStore.getState().closePane(newPaneId)
		const { panes, splitTree } = useWorkspaceStore.getState()
		expect(Object.keys(panes)).toHaveLength(1)
		expect(splitTree.type).toBe("leaf")
	})

	it("is a no-op when only one pane exists", () => {
		useWorkspaceStore.getState().closePane(ROOT_PANE_ID)
		expect(Object.keys(useWorkspaceStore.getState().panes)).toHaveLength(1)
	})
})

describe("activateTab()", () => {
	it("sets the pane activeTabId", () => {
		useWorkspaceStore.getState().openTab("/vault/a.md")
		useWorkspaceStore.getState().openTab("/vault/b.md")
		const { panes } = useWorkspaceStore.getState()
		const tabA = panes[ROOT_PANE_ID].tabs.find((t) => t.filePath === "/vault/a.md")!
		useWorkspaceStore.getState().activateTab(tabA.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].activeTabId).toBe(tabA.id)
	})

	it("moves activated tab to front of mruOrder", () => {
		useWorkspaceStore.getState().openTab("/vault/a.md")
		useWorkspaceStore.getState().openTab("/vault/b.md")
		const { panes } = useWorkspaceStore.getState()
		const tabA = panes[ROOT_PANE_ID].tabs.find((t) => t.filePath === "/vault/a.md")!
		useWorkspaceStore.getState().activateTab(tabA.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().mruOrder[0]).toBe(tabA.id)
	})

	it("unsuspends a suspended tab", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const { panes } = useWorkspaceStore.getState()
		const tab = panes[ROOT_PANE_ID].tabs[0]
		// manually suspend the tab
		useWorkspaceStore.setState((s) => {
			s.panes[ROOT_PANE_ID].tabs[0].isSuspended = true
		})
		useWorkspaceStore.getState().activateTab(tab.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0].isSuspended).toBe(false)
	})
})

describe("moveTab()", () => {
	it("moves a tab from source pane to target pane", () => {
		// Open two files in root pane, then split so we have two panes with content
		useWorkspaceStore.getState().openTab("/vault/a.md")
		useWorkspaceStore.getState().openTab("/vault/b.md")
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const newPaneId = useWorkspaceStore.getState().activePaneId

		// Move one tab from root to new pane
		const tab = useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0]
		useWorkspaceStore.getState().moveTab(tab.id, ROOT_PANE_ID, newPaneId)

		// Target pane should have the moved tab
		expect(useWorkspaceStore.getState().panes[newPaneId].tabs.some((t) => t.id === tab.id)).toBe(
			true,
		)
	})

	it("auto-closes source pane when it becomes empty after move", () => {
		// Open one tab, split, then move the only tab from root to new pane
		useWorkspaceStore.getState().openTab("/vault/note.md")
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		const newPaneId = useWorkspaceStore.getState().activePaneId
		const tab = useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0]
		useWorkspaceStore.getState().moveTab(tab.id, ROOT_PANE_ID, newPaneId)
		// Root pane has no tabs, so it gets closed — only one pane remains
		expect(Object.keys(useWorkspaceStore.getState().panes)).toHaveLength(1)
	})
})

describe("markTabDirty()", () => {
	it("marks a tab as dirty", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const tab = useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0]
		useWorkspaceStore.getState().markTabDirty(tab.id, true)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0].isDirty).toBe(true)
	})

	it("clears dirty flag", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const tab = useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0]
		useWorkspaceStore.getState().markTabDirty(tab.id, true)
		useWorkspaceStore.getState().markTabDirty(tab.id, false)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0].isDirty).toBe(false)
	})
})

describe("updateTabPath()", () => {
	it("updates the file path of a tab", () => {
		useWorkspaceStore.getState().openTab("/vault/old.md")
		useWorkspaceStore.getState().updateTabPath("/vault/old.md", "/vault/new.md")
		const pane = useWorkspaceStore.getState().panes[ROOT_PANE_ID]
		expect(pane.tabs[0].filePath).toBe("/vault/new.md")
		expect(pane.tabs[0].title).toBe("new")
	})
})

describe("pinTab()", () => {
	it("toggles pinned state on a tab", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		const tab = useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0]
		useWorkspaceStore.getState().pinTab(tab.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0].isPinned).toBe(true)
		useWorkspaceStore.getState().pinTab(tab.id, ROOT_PANE_ID)
		expect(useWorkspaceStore.getState().panes[ROOT_PANE_ID].tabs[0].isPinned).toBe(false)
	})
})

describe("reset()", () => {
	it("resets workspace to initial state", () => {
		useWorkspaceStore.getState().openTab("/vault/note.md")
		useWorkspaceStore.getState().splitPane(ROOT_PANE_ID, "horizontal")
		useWorkspaceStore.getState().reset()
		const { panes, splitTree } = useWorkspaceStore.getState()
		expect(Object.keys(panes)).toHaveLength(1)
		expect(splitTree.type).toBe("leaf")
		expect(panes[ROOT_PANE_ID].tabs).toHaveLength(0)
	})
})
