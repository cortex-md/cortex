import { getPlatform } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useAuthStore } from "../../stores/authStore"
import {
	createDefaultSyncConfig,
	DEFAULT_SYNC_SERVER_URL,
	normalizeSyncConfig,
	useRemoteVaultStore,
} from "../../stores/remoteVaultStore"

const updateSyncConfig = vi.fn().mockResolvedValue(undefined)
const getStatus = vi.fn()

beforeEach(() => {
	vi.clearAllMocks()
	useAuthStore.setState({
		authenticated: false,
		user: null,
		loading: false,
		error: null,
		serverUrl: DEFAULT_SYNC_SERVER_URL,
	})
	useRemoteVaultStore.setState({
		remoteVaults: [],
		linkedVaultId: null,
		syncConfig: createDefaultSyncConfig(),
		loading: false,
		error: null,
	})
	vi.mocked(getPlatform).mockReturnValue({
		auth: {
			getStatus,
		},
		remoteVault: {
			updateSyncConfig,
		},
	} as never)
})

describe("remoteVaultStore sync config", () => {
	it("normalizes legacy sync config with vault-scoped defaults", () => {
		expect(
			normalizeSyncConfig({
				remoteVaultId: "remote-vault-id",
				selfHosted: true,
			}),
		).toEqual({
			...createDefaultSyncConfig(),
			remoteVaultId: "remote-vault-id",
			selfHosted: true,
			serverUrl: DEFAULT_SYNC_SERVER_URL,
			selfHostedEnvironment: {},
		})
	})

	it("rejects enabling sync without an authenticated account", async () => {
		getStatus.mockResolvedValue({
			authenticated: false,
			userId: null,
			email: null,
			displayName: null,
		})

		await expect(useRemoteVaultStore.getState().setSyncEnabled("/vault", true)).rejects.toThrow(
			"Sign in before enabling sync",
		)

		expect(updateSyncConfig).not.toHaveBeenCalled()
		expect(useRemoteVaultStore.getState().syncConfig.enabled).toBe(false)
	})

	it("persists enabling sync after authentication is confirmed", async () => {
		getStatus.mockResolvedValue({
			authenticated: true,
			userId: "user-id",
			email: "jane@example.com",
			displayName: "Jane Doe",
		})

		await useRemoteVaultStore.getState().setSyncEnabled("/vault", true)

		expect(updateSyncConfig).toHaveBeenCalledWith("/vault", "enabled", true)
		expect(useRemoteVaultStore.getState().syncConfig.enabled).toBe(true)
	})
})
