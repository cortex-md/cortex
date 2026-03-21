import { cleanup, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useVaultStore: vi.fn(),
	useAuthStore: vi.fn(),
	useRemoteVaultStore: vi.fn(),
	useSyncStore: vi.fn(),
	useSyncLogStore: {
		getState: vi.fn(() => ({ log: vi.fn() })),
	},
}))

import {
	useAuthStore,
	useRemoteVaultStore,
	useSyncLogStore,
	useSyncStore,
	useVaultStore,
} from "@cortex/core"
import { useSyncLifecycle } from "../../hooks/useSyncLifecycle"

const mockVault = { path: "/vault", name: "Test", uuid: "vault-id" }
const startSync = vi.fn().mockResolvedValue(undefined)
const stopSync = vi.fn().mockResolvedValue(undefined)
const loadLink = vi.fn().mockResolvedValue(undefined)
const logFn = vi.fn()

function setupMocks(overrides: {
	authenticated?: boolean
	selfHosted?: boolean
	syncEnabled?: boolean
	serverUrl?: string
	vault?: typeof mockVault | null
	linkedVaultId?: string | null
}) {
	vi.mocked(useSyncLogStore.getState).mockReturnValue({ log: logFn } as never)

	vi.mocked(useVaultStore).mockImplementation((selector?: (s: unknown) => unknown) => {
		const state = { vault: overrides.vault ?? null }
		return selector ? selector(state) : state
	})

	vi.mocked(useAuthStore).mockImplementation((selector?: (s: unknown) => unknown) => {
		const state = {
			authenticated: overrides.authenticated ?? false,
			selfHosted: overrides.selfHosted ?? false,
			syncEnabled: overrides.syncEnabled ?? true,
			serverUrl: overrides.serverUrl ?? "https://sync.example.com",
		}
		return selector ? selector(state) : state
	})

	vi.mocked(useRemoteVaultStore).mockReturnValue({
		linkedVaultId: overrides.linkedVaultId ?? null,
		loadLink,
	} as never)

	vi.mocked(useSyncStore).mockReturnValue({ startSync, stopSync } as never)
}

afterEach(() => {
	cleanup()
	startSync.mockClear()
	stopSync.mockClear()
	loadLink.mockClear()
	logFn.mockClear()
})

describe("useSyncLifecycle", () => {
	describe("when all conditions are met", () => {
		beforeEach(() => {
			setupMocks({
				authenticated: true,
				syncEnabled: true,
				serverUrl: "https://sync.example.com",
				vault: mockVault,
				linkedVaultId: "remote-vault-id",
			})
		})

		it("calls startSync with vaultId, vaultPath, and serverUrl", () => {
			renderHook(() => useSyncLifecycle())
			expect(startSync).toHaveBeenCalledWith(
				"remote-vault-id",
				mockVault.path,
				"https://sync.example.com",
			)
		})

		it("logs 'starting sync' to syncLogStore", () => {
			renderHook(() => useSyncLifecycle())
			expect(logFn).toHaveBeenCalledWith(
				"info",
				expect.stringContaining("starting sync"),
				expect.any(Object),
			)
		})
	})

	describe("when user is not authenticated and not selfHosted", () => {
		it("does not call startSync", () => {
			setupMocks({ authenticated: false, selfHosted: false, vault: mockVault, linkedVaultId: "id" })
			renderHook(() => useSyncLifecycle())
			expect(startSync).not.toHaveBeenCalled()
		})
	})

	describe("when selfHosted is true (without authenticated)", () => {
		it("calls startSync", () => {
			setupMocks({
				authenticated: false,
				selfHosted: true,
				syncEnabled: true,
				serverUrl: "https://self.hosted.com",
				vault: mockVault,
				linkedVaultId: "remote-vault-id",
			})
			renderHook(() => useSyncLifecycle())
			expect(startSync).toHaveBeenCalled()
		})
	})

	describe("when syncEnabled is false", () => {
		it("does not call startSync", () => {
			setupMocks({
				authenticated: true,
				syncEnabled: false,
				vault: mockVault,
				linkedVaultId: "id",
			})
			renderHook(() => useSyncLifecycle())
			expect(startSync).not.toHaveBeenCalled()
		})
	})

	describe("when vault is null", () => {
		it("does not call startSync", () => {
			setupMocks({
				authenticated: true,
				syncEnabled: true,
				vault: null,
				linkedVaultId: "id",
			})
			renderHook(() => useSyncLifecycle())
			expect(startSync).not.toHaveBeenCalled()
		})
	})

	describe("when linkedVaultId is null", () => {
		it("does not call startSync", () => {
			setupMocks({
				authenticated: true,
				syncEnabled: true,
				vault: mockVault,
				linkedVaultId: null,
			})
			renderHook(() => useSyncLifecycle())
			expect(startSync).not.toHaveBeenCalled()
		})
	})

	describe("when serverUrl is empty", () => {
		it("does not call startSync", () => {
			setupMocks({
				authenticated: true,
				syncEnabled: true,
				serverUrl: "",
				vault: mockVault,
				linkedVaultId: "id",
			})
			renderHook(() => useSyncLifecycle())
			expect(startSync).not.toHaveBeenCalled()
		})
	})

	describe("cleanup on unmount", () => {
		it("calls stopSync when sync was active and component unmounts", () => {
			setupMocks({
				authenticated: true,
				syncEnabled: true,
				serverUrl: "https://sync.example.com",
				vault: mockVault,
				linkedVaultId: "remote-vault-id",
			})
			const { unmount } = renderHook(() => useSyncLifecycle())
			expect(startSync).toHaveBeenCalled()
			unmount()
			expect(stopSync).toHaveBeenCalled()
		})

		it("does NOT call stopSync on unmount when sync was never started", () => {
			setupMocks({ authenticated: false, vault: null, linkedVaultId: null })
			const { unmount } = renderHook(() => useSyncLifecycle())
			unmount()
			expect(stopSync).not.toHaveBeenCalled()
		})
	})

	describe("loadLink behavior", () => {
		it("calls loadLink with vault path when vault is open", () => {
			setupMocks({ vault: mockVault, linkedVaultId: null })
			renderHook(() => useSyncLifecycle())
			expect(loadLink).toHaveBeenCalledWith(mockVault.path)
		})

		it("calls loadLink with empty string when vault is null", () => {
			setupMocks({ vault: null, linkedVaultId: null })
			renderHook(() => useSyncLifecycle())
			expect(loadLink).toHaveBeenCalledWith("")
		})
	})
})
