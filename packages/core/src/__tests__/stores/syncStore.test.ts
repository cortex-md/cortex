import { getPlatform } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	createDefaultSyncPreferences,
	shouldIgnoreSyncPath,
	useSyncStore,
} from "../../stores/syncStore"
import { useVaultStore } from "../../stores/vaultStore"

function mockPlatform({
	readFile = vi.fn().mockResolvedValue(""),
	writeFile = vi.fn().mockResolvedValue(undefined),
	updateSyncPreferences = vi.fn().mockResolvedValue(undefined),
} = {}) {
	vi.mocked(getPlatform).mockReturnValue({
		fs: {
			readFile,
			writeFile,
		},
		sync: {
			updateSyncPreferences,
		},
	} as never)

	return { readFile, writeFile, updateSyncPreferences }
}

beforeEach(() => {
	useSyncStore.setState({
		syncPreferences: createDefaultSyncPreferences(),
		error: null,
	})
	useVaultStore.setState({
		vault: null,
		files: [],
	})
	vi.clearAllMocks()
})

describe("syncStore preferences", () => {
	it("loads older sync preferences with ignoreImages defaulting to false", async () => {
		const { updateSyncPreferences } = mockPlatform({
			readFile: vi.fn().mockResolvedValue(
				JSON.stringify({
					syncSettings: true,
					excludedPaths: ["private/"],
				}),
			),
		})

		await useSyncStore.getState().loadSyncPreferences("/vault")

		expect(useSyncStore.getState().syncPreferences).toEqual({
			...createDefaultSyncPreferences(),
			syncSettings: true,
			ignoreImages: false,
			excludedPaths: ["private/"],
		})
		expect(updateSyncPreferences).toHaveBeenCalledWith(
			expect.objectContaining({
				syncSettings: true,
				ignoreImages: false,
				excludedPaths: ["private/"],
			}),
		)
	})

	it("persists ignoreImages updates and sends them to the sync engine", async () => {
		const { writeFile, updateSyncPreferences } = mockPlatform()
		useVaultStore.setState({
			vault: {
				uuid: "vault-id",
				path: "/vault",
				name: "Vault",
				fileCount: 0,
			},
		})

		await useSyncStore.getState().updateSyncPreference("ignoreImages", true)

		expect(writeFile).toHaveBeenCalledWith(
			"/vault/.cortex/sync-preferences.json",
			expect.any(String),
		)
		expect(JSON.parse(writeFile.mock.calls[0][1])).toEqual(
			expect.objectContaining({ ignoreImages: true }),
		)
		expect(updateSyncPreferences).toHaveBeenCalledWith(
			expect.objectContaining({ ignoreImages: true }),
		)
	})

	it("recognizes image paths when ignoreImages is enabled", () => {
		const preferences = {
			...createDefaultSyncPreferences(),
			ignoreImages: true,
		}

		expect(shouldIgnoreSyncPath("attachments/photo.WEBP", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("attachments/photo.md", preferences)).toBe(false)
	})

	it("matches gitignore-style excluded path patterns", () => {
		const preferences = {
			...createDefaultSyncPreferences(),
			excludedPaths: ["node_modules/", "*.log", "docs/**/*.tmp", "dist/", "!dist/keep.md"],
		}

		expect(shouldIgnoreSyncPath("node_modules/package.json", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("packages/app/node_modules/cache.bin", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("logs/debug.log", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("docs/drafts/one.tmp", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("dist/app.js", preferences)).toBe(true)
		expect(shouldIgnoreSyncPath("dist/keep.md", preferences)).toBe(false)
		expect(shouldIgnoreSyncPath("src/node_modules.md", preferences)).toBe(false)
	})
})
