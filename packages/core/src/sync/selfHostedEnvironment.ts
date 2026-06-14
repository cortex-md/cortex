export interface SelfHostedEnvironmentField {
	key: string
	label: string
	defaultValue: string
	secret?: boolean
}

export interface SelfHostedEnvironmentSubsection {
	id: string
	label: string
	fields: SelfHostedEnvironmentField[]
}

export interface SelfHostedEnvironmentGroup {
	id: string
	label: string
	description: string
	sections: SelfHostedEnvironmentSubsection[]
}

export const SELF_HOSTED_ENVIRONMENT_GROUPS: SelfHostedEnvironmentGroup[] = [
	{
		id: "server",
		label: "Server",
		description: "Runtime, sync limits, collaboration, operations, and subscriptions.",
		sections: [
			{
				id: "runtime",
				label: "Runtime",
				fields: [
					{ key: "CORTEX_SERVER_HOST", label: "Host", defaultValue: "0.0.0.0" },
					{ key: "CORTEX_SERVER_PORT", label: "Port", defaultValue: "8080" },
					{
						key: "CORTEX_SERVER_SHUTDOWN_TIMEOUT",
						label: "Shutdown timeout",
						defaultValue: "15s",
					},
				],
			},
			{
				id: "sync-limits",
				label: "Sync limits",
				fields: [
					{
						key: "CORTEX_SYNC_MAX_DELTAS_BEFORE_SNAPSHOT",
						label: "Deltas before snapshot",
						defaultValue: "10",
					},
					{
						key: "CORTEX_SYNC_MAX_DELTA_SIZE_RATIO",
						label: "Delta size ratio",
						defaultValue: "0.5",
					},
					{
						key: "CORTEX_SYNC_MAX_FILE_SIZE",
						label: "Max file size",
						defaultValue: "104857600",
					},
					{
						key: "CORTEX_SYNC_MAX_SNAPSHOTS_PER_FILE",
						label: "Snapshots per file",
						defaultValue: "50",
					},
					{
						key: "CORTEX_SYNC_EVENT_RETENTION",
						label: "Event retention",
						defaultValue: "720h",
					},
				],
			},
			{
				id: "collaboration",
				label: "Collaboration",
				fields: [
					{
						key: "CORTEX_COLLAB_MAX_PEERS_PER_ROOM",
						label: "Max peers per room",
						defaultValue: "10",
					},
					{
						key: "CORTEX_COLLAB_FLUSH_INTERVAL",
						label: "Flush interval",
						defaultValue: "10s",
					},
				],
			},
			{
				id: "operations",
				label: "Operations",
				fields: [
					{ key: "CORTEX_METRICS_ENABLED", label: "Metrics enabled", defaultValue: "true" },
					{ key: "CORTEX_METRICS_PATH", label: "Metrics path", defaultValue: "/metrics" },
					{
						key: "CORTEX_RATE_LIMIT_REQUESTS_PER_SECOND",
						label: "Requests per second",
						defaultValue: "100",
					},
					{ key: "CORTEX_RATE_LIMIT_BURST", label: "Burst", defaultValue: "200" },
				],
			},
			{
				id: "subscription",
				label: "Subscription",
				fields: [
					{
						key: "CORTEX_SUBSCRIPTION_ENABLED",
						label: "Enabled",
						defaultValue: "false",
					},
					{
						key: "CORTEX_SUBSCRIPTION_API_KEY",
						label: "API key",
						defaultValue: "",
						secret: true,
					},
					{
						key: "CORTEX_SUBSCRIPTION_PRODUCT_ID",
						label: "Product ID",
						defaultValue: "",
					},
					{
						key: "CORTEX_SUBSCRIPTION_CACHE_TTL",
						label: "Cache TTL",
						defaultValue: "5m",
					},
				],
			},
		],
	},
	{
		id: "database",
		label: "Database",
		description: "PostgreSQL connection and pool sizing.",
		sections: [
			{
				id: "database",
				label: "Database",
				fields: [
					{
						key: "CORTEX_DATABASE_URL",
						label: "PostgreSQL URL",
						defaultValue: "postgres://cortex:cortex@localhost:5432/cortex_sync?sslmode=disable",
					},
					{ key: "CORTEX_DATABASE_MAX_CONNS", label: "Max connections", defaultValue: "25" },
					{ key: "CORTEX_DATABASE_MIN_CONNS", label: "Min connections", defaultValue: "5" },
				],
			},
		],
	},
	{
		id: "authentication",
		label: "Authentication",
		description: "Access tokens, refresh lifetime, and issuer identity.",
		sections: [
			{
				id: "authentication",
				label: "Authentication",
				fields: [
					{
						key: "CORTEX_AUTH_ACCESS_TOKEN_SECRET",
						label: "Access token secret",
						defaultValue: "change-me-in-production",
						secret: true,
					},
					{
						key: "CORTEX_AUTH_ACCESS_TOKEN_EXPIRY",
						label: "Access token expiry",
						defaultValue: "15m",
					},
					{
						key: "CORTEX_AUTH_REFRESH_TOKEN_EXPIRY",
						label: "Refresh token expiry",
						defaultValue: "2160h",
					},
					{ key: "CORTEX_AUTH_ISSUER", label: "Issuer", defaultValue: "cortex-sync" },
				],
			},
		],
	},
	{
		id: "storage",
		label: "Storage",
		description: "S3-compatible snapshot and asset storage.",
		sections: [
			{
				id: "storage",
				label: "Storage",
				fields: [
					{ key: "CORTEX_S3_PROVIDER", label: "Provider", defaultValue: "minio" },
					{ key: "CORTEX_S3_ENDPOINT", label: "Endpoint", defaultValue: "localhost:9000" },
					{
						key: "CORTEX_S3_ACCESS_KEY",
						label: "Access key",
						defaultValue: "minioadmin",
						secret: true,
					},
					{
						key: "CORTEX_S3_SECRET_KEY",
						label: "Secret key",
						defaultValue: "minioadmin",
						secret: true,
					},
					{ key: "CORTEX_S3_BUCKET", label: "Bucket", defaultValue: "cortex-snapshots" },
					{ key: "CORTEX_S3_USE_SSL", label: "Use SSL", defaultValue: "false" },
					{ key: "CORTEX_S3_REGION", label: "Region", defaultValue: "us-east-1" },
				],
			},
		],
	},
]

export const SELF_HOSTED_ENVIRONMENT_FIELDS = SELF_HOSTED_ENVIRONMENT_GROUPS.flatMap((group) =>
	group.sections.flatMap((section) => section.fields),
)

export function createSyncEnvironmentSecretKey(vaultId: string, fieldKey: string): string {
	return `sync-env-secret:${vaultId}:${fieldKey}`
}

export function serializeSelfHostedEnvironment(
	values: Record<string, string>,
	secrets: Record<string, string>,
): string {
	return SELF_HOSTED_ENVIRONMENT_FIELDS.map((field) => {
		const value = field.secret ? secrets[field.key] : values[field.key]
		return `${field.key}=${value || field.defaultValue}`
	}).join("\n")
}
