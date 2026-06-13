import { getPlatform } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { noteCache } from "../../noteCache"
import { useBookmarksStore } from "../../stores/bookmarksStore"
import { useVaultStore } from "../../stores/vaultStore"
import { useWorkspaceStore } from "../../stores/workspaceStore"

const oldPath = "/vault/Current.md"
const newPath = "/vault/Renamed.md"

beforeEach(() => {
	noteCache.clear()
	useBookmarksStore.setState({ bookmarks: [] })
	useWorkspaceStore.getState().reset()
	useVaultStore.setState({
		vault: {
			uuid: "vault-id",
			path: "/vault",
			name: "Vault",
			fileCount: 1,
		},
		files: [],
		error: null,
	})
	vi.clearAllMocks()
})

describe("vaultStore renameFile", () => {
	it("flushes and migrates cache, tabs, and bookmarks after the platform rename", async () => {
		const readFile = vi.fn().mockResolvedValue("initial")
		const writeFile = vi.fn().mockResolvedValue(undefined)
		const hashFile = vi.fn().mockResolvedValue("hash")
		const renameFile = vi.fn().mockResolvedValue(undefined)
		const scanVault = vi.fn().mockResolvedValue([])
		vi.mocked(getPlatform).mockReturnValue({
			fs: { readFile, writeFile, hashFile, renameFile },
			vault: { scanVault },
		} as never)

		await noteCache.read(oldPath)
		noteCache.write(oldPath, "changed")
		useWorkspaceStore.getState().openTab(oldPath)
		useBookmarksStore.setState({ bookmarks: [oldPath] })

		const result = await useVaultStore.getState().renameFile(oldPath, "Renamed.md")

		expect(result).toBe(newPath)
		expect(writeFile).toHaveBeenCalledWith(oldPath, "changed")
		expect(renameFile).toHaveBeenCalledWith(oldPath, newPath)
		expect(writeFile.mock.invocationCallOrder[0]).toBeLessThan(
			renameFile.mock.invocationCallOrder[0],
		)
		expect(noteCache.getEntry(oldPath)).toBeUndefined()
		expect(noteCache.getEntry(newPath)?.openTabCount).toBe(1)
		expect(
			Object.values(useWorkspaceStore.getState().panes).flatMap((pane) =>
				pane.tabs.map((tab) => tab.filePath),
			),
		).toContain(newPath)
		expect(useBookmarksStore.getState().bookmarks).toEqual([newPath])
	})
})
