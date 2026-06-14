import { describe, expect, it } from "vitest"
import { formatLastSyncedAt, SYNC_STATUS_PRESENTATION } from "./presentation"
import {
	createSyncEnvironmentSecretKey,
	SELF_HOSTED_ENVIRONMENT_FIELDS,
	SELF_HOSTED_ENVIRONMENT_GROUPS,
	serializeSelfHostedEnvironment,
} from "./selfHostedEnvironment"

describe("self-hosted sync environment", () => {
	it("keeps the catalog ordered and field keys unique", () => {
		expect(SELF_HOSTED_ENVIRONMENT_GROUPS.map((group) => group.id)).toEqual([
			"server",
			"database",
			"authentication",
			"storage",
		])
		expect(new Set(SELF_HOSTED_ENVIRONMENT_FIELDS.map((field) => field.key)).size).toBe(
			SELF_HOSTED_ENVIRONMENT_FIELDS.length,
		)
	})

	it("creates vault-scoped secret keys", () => {
		expect(createSyncEnvironmentSecretKey("vault-id", "CORTEX_S3_SECRET_KEY")).toBe(
			"sync-env-secret:vault-id:CORTEX_S3_SECRET_KEY",
		)
	})

	it("serializes values in catalog order and resolves secrets separately", () => {
		const serialized = serializeSelfHostedEnvironment(
			{
				CORTEX_SERVER_HOST: "127.0.0.1",
				CORTEX_DATABASE_URL: "postgres://custom",
			},
			{
				CORTEX_AUTH_ACCESS_TOKEN_SECRET: "auth-secret",
			},
		)
		const lines = serialized.split("\n")

		expect(lines[0]).toBe("CORTEX_SERVER_HOST=127.0.0.1")
		expect(lines).toContain("CORTEX_DATABASE_URL=postgres://custom")
		expect(lines).toContain("CORTEX_AUTH_ACCESS_TOKEN_SECRET=auth-secret")
		expect(lines).toContain("CORTEX_S3_SECRET_KEY=minioadmin")
		expect(lines).toHaveLength(SELF_HOSTED_ENVIRONMENT_FIELDS.length)
	})
})

describe("sync settings presentation", () => {
	it("defines a label and tone for every engine state", () => {
		expect(Object.keys(SYNC_STATUS_PRESENTATION)).toEqual([
			"idle",
			"authenticating",
			"connecting",
			"syncing",
			"live",
			"offline",
			"recovering",
			"denied",
		])
		expect(SYNC_STATUS_PRESENTATION.live).toEqual({ label: "Synced", tone: "success" })
		expect(SYNC_STATUS_PRESENTATION.denied).toEqual({
			label: "Access denied",
			tone: "error",
		})
	})

	it("formats relative sync timestamps with an injected clock", () => {
		const now = new Date("2026-06-14T12:00:00.000Z").getTime()
		expect(formatLastSyncedAt(null, () => now)).toBe("Not synced yet")
		expect(formatLastSyncedAt(now - 30_000, () => now)).toBe("Just now")
		expect(formatLastSyncedAt(now - 60_000, () => now)).toBe("1 minute ago")
		expect(formatLastSyncedAt(now - 120 * 60_000, () => now)).toBe("2 hours ago")
	})
})
