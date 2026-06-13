import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockReadFile = vi.fn()
const mockWriteFile = vi.fn()
const mockHashFile = vi.fn()

vi.mock("@cortex/platform", () => ({
	getPlatform: vi.fn(() => ({
		fs: {
			readFile: mockReadFile,
			writeFile: mockWriteFile,
			hashFile: mockHashFile,
		},
	})),
	initPlatform: vi.fn(),
}))

import { noteCache } from "../noteCache"

const FILE_PATH = "/vault/test.md"

beforeEach(() => {
	mockReadFile.mockResolvedValue("initial content")
	mockHashFile.mockResolvedValue("hash-initial")
	mockWriteFile.mockResolvedValue(undefined)
	noteCache.clear()
	vi.useFakeTimers()
})

afterEach(() => {
	noteCache.clear()
	vi.useRealTimers()
	vi.clearAllMocks()
})

async function seedEntry(content = "initial content", hash = "hash-initial") {
	mockReadFile.mockResolvedValue(content)
	mockHashFile.mockResolvedValue(hash)
	return noteCache.read(FILE_PATH)
}

describe("read()", () => {
	it("reads from disk on first access", async () => {
		mockReadFile.mockResolvedValue("disk content")
		const content = await noteCache.read(FILE_PATH)
		expect(content).toBe("disk content")
		expect(mockReadFile).toHaveBeenCalledWith(FILE_PATH)
	})

	it("returns cached content without re-reading disk on second call", async () => {
		await noteCache.read(FILE_PATH)
		mockReadFile.mockResolvedValue("new disk content")
		const content = await noteCache.read(FILE_PATH)
		expect(content).toBe("initial content")
		expect(mockReadFile).toHaveBeenCalledTimes(1)
	})

	it("creates an entry with dirty: false", async () => {
		await noteCache.read(FILE_PATH)
		expect(noteCache.isDirty(FILE_PATH)).toBe(false)
	})
})

describe("write()", () => {
	it("marks entry as dirty when content differs from disk", async () => {
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")
		expect(noteCache.isDirty(FILE_PATH)).toBe(true)
	})

	it("does NOT mark dirty when content is same as disk", async () => {
		await seedEntry("initial content")
		noteCache.write(FILE_PATH, "initial content")
		expect(noteCache.isDirty(FILE_PATH)).toBe(false)
	})

	it("does not flush immediately after write", async () => {
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")
		expect(mockWriteFile).not.toHaveBeenCalled()
	})

	it("schedules auto-save after 2 seconds debounce", async () => {
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")
		await vi.advanceTimersByTimeAsync(2001)
		expect(mockWriteFile).toHaveBeenCalledWith(FILE_PATH, "modified content")
	})

	it("is a no-op when entry does not exist", () => {
		noteCache.write("/nonexistent.md", "content")
		expect(mockWriteFile).not.toHaveBeenCalled()
	})
})

describe("flush()", () => {
	it("writes dirty content to disk", async () => {
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")
		await noteCache.flush(FILE_PATH)
		expect(mockWriteFile).toHaveBeenCalledWith(FILE_PATH, "modified content")
	})

	it("marks entry as not dirty after flush", async () => {
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")
		await noteCache.flush(FILE_PATH)
		expect(noteCache.isDirty(FILE_PATH)).toBe(false)
	})

	it("is a no-op when entry is clean", async () => {
		await seedEntry()
		await noteCache.flush(FILE_PATH)
		expect(mockWriteFile).not.toHaveBeenCalled()
	})

	it("is a no-op when entry does not exist", async () => {
		await noteCache.flush("/nonexistent.md")
		expect(mockWriteFile).not.toHaveBeenCalled()
	})
})

describe("flushAll()", () => {
	it("flushes all dirty entries", async () => {
		const fileA = "/vault/a.md"
		const fileB = "/vault/b.md"
		mockReadFile.mockResolvedValue("content")
		mockHashFile.mockResolvedValue("hash")
		await noteCache.read(fileA)
		await noteCache.read(fileB)
		noteCache.write(fileA, "modified A")
		noteCache.write(fileB, "modified B")
		await noteCache.flushAll()
		expect(mockWriteFile).toHaveBeenCalledWith(fileA, "modified A")
		expect(mockWriteFile).toHaveBeenCalledWith(fileB, "modified B")
	})

	it("skips clean entries", async () => {
		await seedEntry()
		await noteCache.flushAll()
		expect(mockWriteFile).not.toHaveBeenCalled()
	})
})

describe("renamePath()", () => {
	it("moves cache state, snapshots, and open tab ownership to the new path", async () => {
		const newPath = "/vault/renamed.md"
		await seedEntry()
		noteCache.openTab(FILE_PATH)
		noteCache.takeSnapshot(FILE_PATH, "manual")

		noteCache.renamePath(FILE_PATH, newPath)

		expect(noteCache.getEntry(FILE_PATH)).toBeUndefined()
		expect(noteCache.getEntry(newPath)).toMatchObject({
			filePath: newPath,
			openTabCount: 1,
		})
		expect(noteCache.getSnapshots(newPath)).toHaveLength(1)
	})

	it("moves a pending save so it cannot write to the old path", async () => {
		const newPath = "/vault/renamed.md"
		await seedEntry()
		noteCache.write(FILE_PATH, "modified content")

		noteCache.renamePath(FILE_PATH, newPath)
		await vi.advanceTimersByTimeAsync(2001)

		expect(mockWriteFile).toHaveBeenCalledWith(newPath, "modified content")
		expect(mockWriteFile).not.toHaveBeenCalledWith(FILE_PATH, "modified content")
	})
})

describe("openTab() / closeTab()", () => {
	it("increments openTabCount when file is already in cache", async () => {
		await seedEntry()
		noteCache.openTab(FILE_PATH)
		const entry = noteCache.getEntry(FILE_PATH)
		expect(entry?.openTabCount).toBe(1)
	})

	it("is a no-op when entry does not exist", () => {
		expect(() => noteCache.openTab("/nonexistent.md")).not.toThrow()
	})

	it("decrements openTabCount on closeTab", async () => {
		await seedEntry()
		noteCache.openTab(FILE_PATH)
		await noteCache.closeTab(FILE_PATH)
		const entry = noteCache.getEntry(FILE_PATH)
		expect(entry?.openTabCount).toBe(0)
	})

	it("flushes dirty content on closeTab", async () => {
		await seedEntry()
		noteCache.openTab(FILE_PATH)
		noteCache.write(FILE_PATH, "modified content")
		await noteCache.closeTab(FILE_PATH)
		expect(mockWriteFile).toHaveBeenCalledWith(FILE_PATH, "modified content")
	})

	it("does not go below 0 on closeTab", async () => {
		await seedEntry()
		await noteCache.closeTab(FILE_PATH)
		const entry = noteCache.getEntry(FILE_PATH)
		expect(entry?.openTabCount).toBe(0)
	})
})

describe("takeSnapshot()", () => {
	it("creates snapshot with correct trigger and content", async () => {
		await seedEntry("my content")
		const snapshot = noteCache.takeSnapshot(FILE_PATH, "manual")
		expect(snapshot).not.toBeNull()
		expect(snapshot?.trigger).toBe("manual")
		expect(snapshot?.content).toBe("my content")
	})

	it("stores snapshot in entry", async () => {
		await seedEntry()
		noteCache.takeSnapshot(FILE_PATH, "auto")
		expect(noteCache.getSnapshots(FILE_PATH)).toHaveLength(1)
	})

	it("returns null when entry does not exist", () => {
		const snapshot = noteCache.takeSnapshot("/nonexistent.md", "manual")
		expect(snapshot).toBeNull()
	})

	it("evicts oldest snapshot when exceeding 50 snapshots", async () => {
		await seedEntry()
		for (let i = 0; i < 51; i++) {
			noteCache.takeSnapshot(FILE_PATH, "auto")
		}
		expect(noteCache.getSnapshots(FILE_PATH).length).toBeLessThanOrEqual(50)
	})
})

describe("handleExternalChange()", () => {
	it("overwrites clean entry with new content", async () => {
		await seedEntry("old content", "hash-old")
		mockReadFile.mockResolvedValue("new content")
		const listener = vi.fn()
		noteCache.onExternalChange(listener)
		await noteCache.handleExternalChange(FILE_PATH, "hash-new")
		expect(noteCache.getEntry(FILE_PATH)?.content).toBe("new content")
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ filePath: FILE_PATH, kind: "overwrite" }),
		)
	})

	it("emits conflict event for dirty entry", async () => {
		await seedEntry("original", "hash-original")
		noteCache.write(FILE_PATH, "locally modified")
		const listener = vi.fn()
		noteCache.onExternalChange(listener)
		await noteCache.handleExternalChange(FILE_PATH, "hash-remote")
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ filePath: FILE_PATH, kind: "conflict" }),
		)
	})

	it("is a no-op when hash has not changed", async () => {
		await seedEntry("content", "hash-initial")
		const listener = vi.fn()
		noteCache.onExternalChange(listener)
		await noteCache.handleExternalChange(FILE_PATH, "hash-initial")
		expect(listener).not.toHaveBeenCalled()
	})

	it("is a no-op when entry does not exist", async () => {
		const listener = vi.fn()
		noteCache.onExternalChange(listener)
		await noteCache.handleExternalChange("/nonexistent.md", "some-hash")
		expect(listener).not.toHaveBeenCalled()
	})
})

describe("writeExternal()", () => {
	it("updates entry content", async () => {
		await seedEntry("original")
		noteCache.writeExternal(FILE_PATH, "externally updated")
		expect(noteCache.getEntry(FILE_PATH)?.content).toBe("externally updated")
	})

	it("notifies content change listeners", async () => {
		await seedEntry()
		const listener = vi.fn()
		noteCache.onContentChange(FILE_PATH, listener)
		noteCache.writeExternal(FILE_PATH, "updated content")
		expect(listener).toHaveBeenCalledWith(FILE_PATH, "updated content")
	})

	it("is a no-op when entry does not exist", () => {
		expect(() => noteCache.writeExternal("/nonexistent.md", "content")).not.toThrow()
	})
})

describe("onContentChange()", () => {
	it("calls listener when writeExternal updates content", async () => {
		await seedEntry()
		const listener = vi.fn()
		noteCache.onContentChange(FILE_PATH, listener)
		noteCache.writeExternal(FILE_PATH, "new content")
		expect(listener).toHaveBeenCalledTimes(1)
		expect(listener).toHaveBeenCalledWith(FILE_PATH, "new content")
	})

	it("unsubscribe stops listener from being called", async () => {
		await seedEntry()
		const listener = vi.fn()
		const unsubscribe = noteCache.onContentChange(FILE_PATH, listener)
		unsubscribe()
		noteCache.writeExternal(FILE_PATH, "new content")
		expect(listener).not.toHaveBeenCalled()
	})

	it("supports multiple listeners for same file", async () => {
		await seedEntry()
		const listenerA = vi.fn()
		const listenerB = vi.fn()
		noteCache.onContentChange(FILE_PATH, listenerA)
		noteCache.onContentChange(FILE_PATH, listenerB)
		noteCache.writeExternal(FILE_PATH, "updated")
		expect(listenerA).toHaveBeenCalled()
		expect(listenerB).toHaveBeenCalled()
	})
})

describe("isDirty() / getEntry() / getSnapshots()", () => {
	it("isDirty returns false for clean entry", async () => {
		await seedEntry()
		expect(noteCache.isDirty(FILE_PATH)).toBe(false)
	})

	it("isDirty returns false for nonexistent entry", () => {
		expect(noteCache.isDirty("/nonexistent.md")).toBe(false)
	})

	it("getEntry returns undefined for nonexistent path", () => {
		expect(noteCache.getEntry("/nonexistent.md")).toBeUndefined()
	})

	it("getSnapshots returns empty array for nonexistent path", () => {
		expect(noteCache.getSnapshots("/nonexistent.md")).toEqual([])
	})
})
