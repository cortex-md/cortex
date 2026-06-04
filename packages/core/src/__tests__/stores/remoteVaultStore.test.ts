import { describe, expect, it } from "vitest"
import {
	createDefaultSyncConfig,
	DEFAULT_SYNC_SERVER_URL,
	normalizeSyncConfig,
} from "../../stores/remoteVaultStore"

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
})
