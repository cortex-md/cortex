import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

const platformMocks = vi.hoisted(() => ({
	showConfirm: vi.fn().mockResolvedValue(true),
	keychainGet: vi.fn().mockResolvedValue(null),
	keychainSet: vi.fn().mockResolvedValue(undefined),
	keychainDelete: vi.fn().mockResolvedValue(undefined),
	saveFile: vi.fn().mockResolvedValue("/exports/.env"),
	writeFile: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@cortex/core", () => ({
	DEFAULT_SYNC_SERVER_URL: "http://localhost:8080",
	useAuthStore: vi.fn(),
	useDevicesStore: vi.fn(),
	useRemoteVaultStore: vi.fn(),
	useSyncStore: vi.fn(),
	useUIStore: vi.fn(),
	useVaultStore: vi.fn(),
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: vi.fn(() => ({
		dialog: {
			showConfirm: platformMocks.showConfirm,
			saveFile: platformMocks.saveFile,
		},
		fs: {
			writeFile: platformMocks.writeFile,
		},
		keychain: {
			get: platformMocks.keychainGet,
			set: platformMocks.keychainSet,
			delete: platformMocks.keychainDelete,
		},
	})),
}))

vi.mock("../../../features/sync/MembersPanel", () => ({
	MembersPanel: () => <div>Members panel</div>,
}))
vi.mock("../../../features/sync/VaultLinkModal", () => ({
	VaultLinkModal: () => null,
}))
vi.mock("../../../features/settings/ExcludedPathsSettings", () => ({
	ExcludedPathsSettings: () => <div>Excluded paths panel</div>,
}))

import {
	useAuthStore,
	useDevicesStore,
	useRemoteVaultStore,
	useSyncStore,
	useUIStore,
	useVaultStore,
} from "@cortex/core"
import { SyncSection } from "../../../features/settings/SyncSettings"

const mockVault = { path: "/vault", name: "Test Vault", uuid: "vault-id" }
const closeSettings = vi.fn()
const openAuth = vi.fn()
const logout = vi.fn().mockResolvedValue(undefined)
const setSyncEnabled = vi.fn().mockResolvedValue(undefined)
const saveServerUrl = vi.fn().mockResolvedValue(undefined)
const setSelfHosted = vi.fn().mockResolvedValue(undefined)
const updateSelfHostedEnvironment = vi.fn().mockResolvedValue(undefined)
const unlinkVault = vi.fn().mockResolvedValue(undefined)
const loadLink = vi.fn().mockResolvedValue(undefined)
const fetchRemoteVaults = vi.fn().mockResolvedValue(undefined)
const fetchDevices = vi.fn().mockResolvedValue(undefined)
const updateSyncPreference = vi.fn().mockResolvedValue(undefined)

function setupMocks(
	overrides: {
		authenticated?: boolean
		user?: { userId: string; email: string } | null
		syncEnabled?: boolean
		selfHosted?: boolean
		linkedVaultId?: string | null
		remoteVaults?: Array<{
			id: string
			name: string
			role: string
			memberCount?: number
		}>
		engineState?: string
		lastSyncedAt?: number | null
		deviceEntries?: Array<{ id: string; revoked: boolean }>
		devicesLoading?: boolean
		files?: Array<{ name: string; path: string; isDir: boolean }>
		selfHostedEnvironment?: Record<string, string>
	} = {},
) {
	vi.mocked(useUIStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = { closeSettings, openAuth }
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useAuthStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const authenticated = overrides.authenticated ?? false
		const state = {
			authenticated,
			user:
				overrides.user ?? (authenticated ? { userId: "user-id", email: "you@example.com" } : null),
			logout,
			serverUrl: "https://sync.example.com",
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useVaultStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = {
			vault: mockVault,
			files: overrides.files ?? [
				{ name: "One.md", path: "/vault/One.md", isDir: false },
				{ name: "image.png", path: "/vault/image.png", isDir: false },
			],
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useRemoteVaultStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const linkedVaultId = overrides.linkedVaultId ?? null
		const state = {
			linkedVaultId,
			remoteVaults: overrides.remoteVaults ?? [],
			loadLink,
			fetchRemoteVaults,
			setSyncEnabled,
			saveServerUrl,
			setSelfHosted,
			unlinkVault,
			updateSelfHostedEnvironment,
			syncConfig: {
				enabled: overrides.syncEnabled ?? false,
				remoteVaultId: linkedVaultId,
				selfHosted: overrides.selfHosted ?? false,
				serverUrl: "https://sync.example.com",
				offlineMode: false,
				selfHostedEnvironment: overrides.selfHostedEnvironment ?? {},
			},
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useDevicesStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = {
			deviceEntries: overrides.deviceEntries ?? [],
			loading: overrides.devicesLoading ?? false,
			error: null,
			fetchDevices,
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useSyncStore).mockReturnValue({
		engineState: overrides.engineState ?? "idle",
		lastSyncedAt: overrides.lastSyncedAt ?? null,
		syncPreferences: {
			syncSettings: false,
			syncHotkeys: false,
			syncWorkspace: false,
			syncPluginMetadata: false,
			syncThemeMetadata: false,
			ignoreImages: false,
			excludedPaths: [],
		},
		updateSyncPreference,
	} as never)
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("SyncSection", () => {
	it("lets signed-out users enable sync from the overview", async () => {
		setupMocks({ authenticated: false, syncEnabled: false })
		render(<SyncSection />)

		expect(screen.getByText("Enable sync for this vault")).toBeInTheDocument()
		expect(screen.queryByText("Sign in to connect")).not.toBeInTheDocument()
		expect(screen.queryByText("Connection")).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole("switch", { name: "Enable sync for this vault" }))

		expect(setSyncEnabled).toHaveBeenCalledWith("/vault", true)
	})

	it("shows sign-in CTA after signed-out users enable sync", async () => {
		setupMocks({ authenticated: false, syncEnabled: true })
		render(<SyncSection />)

		expect(screen.getByText("Sign in to connect")).toBeInTheDocument()

		await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

		expect(closeSettings).toHaveBeenCalled()
		expect(openAuth).toHaveBeenCalledWith("login", "sync")
	})

	it("shows vault-link onboarding when authenticated and enabled without a link", async () => {
		setupMocks({ authenticated: true, syncEnabled: true, linkedVaultId: null })
		render(<SyncSection />)

		expect(screen.getByText("Remote vault")).toBeInTheDocument()
		expect(screen.getByText("Link or create a remote vault to start syncing.")).toBeInTheDocument()

		await waitFor(() => {
			expect(fetchRemoteVaults).toHaveBeenCalled()
		})
	})

	it("shows content settings on the preferences page", () => {
		setupMocks({ authenticated: false, syncEnabled: true })
		render(<SyncSection view="preferences" />)

		expect(screen.getByText("Content")).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: "Ignore images" })).toBeInTheDocument()
		expect(screen.getByText("Excluded paths panel")).toBeInTheDocument()
	})

	it("shows members after sync is enabled and linked", () => {
		setupMocks({
			authenticated: true,
			syncEnabled: true,
			linkedVaultId: "remote-vault-id",
			remoteVaults: [{ id: "remote-vault-id", name: "Team Notes", role: "owner" }],
		})
		render(<SyncSection view="members" />)

		expect(screen.getByText("Members")).toBeInTheDocument()
		expect(screen.getByText("Members panel")).toBeInTheDocument()
	})

	it("shows useful linked vault metadata without exposing the remote id", () => {
		setupMocks({
			authenticated: true,
			syncEnabled: true,
			linkedVaultId: "remote-vault-id",
			remoteVaults: [{ id: "remote-vault-id", name: "Team Notes", role: "owner" }],
			engineState: "live",
			lastSyncedAt: Date.now(),
			deviceEntries: [
				{ id: "one", revoked: false },
				{ id: "two", revoked: false },
				{ id: "old", revoked: true },
			],
			files: [
				{ name: "One.md", path: "/vault/One.md", isDir: false },
				{ name: "Two.MD", path: "/vault/Two.MD", isDir: false },
				{ name: "Assets", path: "/vault/Assets", isDir: true },
			],
		})

		render(<SyncSection />)

		expect(screen.getByText("Team Notes")).toBeInTheDocument()
		expect(screen.queryByText("remote-vault-id")).not.toBeInTheDocument()
		expect(screen.getByText("Synced")).toBeInTheDocument()
		expect(screen.getByText("Just now")).toBeInTheDocument()
		expect(screen.getByText("2 devices")).toBeInTheDocument()
		expect(screen.getByText("2 notes")).toBeInTheDocument()
		expect(screen.getByText("owner access")).toBeInTheDocument()
	})

	it("fetches devices only for an enabled linked overview with an empty device store", async () => {
		setupMocks({
			authenticated: true,
			syncEnabled: true,
			linkedVaultId: "remote-vault-id",
			remoteVaults: [{ id: "remote-vault-id", name: "Team Notes", role: "owner" }],
		})

		const { rerender } = render(<SyncSection />)

		await waitFor(() => {
			expect(fetchDevices).toHaveBeenCalledTimes(1)
		})

		rerender(<SyncSection />)

		expect(fetchDevices).toHaveBeenCalledTimes(1)
	})

	it("shows four closed self-host environment groups", () => {
		setupMocks({ authenticated: false, syncEnabled: true, selfHosted: true })
		render(<SyncSection view="self-host" />)

		expect(screen.getByText("Connection")).toBeInTheDocument()
		expect(screen.getByText("Environment")).toBeInTheDocument()
		for (const groupName of ["Server", "Database", "Authentication", "Storage"]) {
			expect(screen.getByRole("button", { name: groupName })).toHaveAttribute(
				"aria-expanded",
				"false",
			)
		}
		expect(screen.queryByRole("button", { name: "Sync Limits" })).not.toBeInTheDocument()
	})

	it("keeps one self-host environment group open at a time", async () => {
		setupMocks({ authenticated: false, syncEnabled: true, selfHosted: true })
		render(<SyncSection view="self-host" />)

		const serverTrigger = screen.getByRole("button", { name: "Server" })
		const databaseTrigger = screen.getByRole("button", { name: "Database" })

		await userEvent.click(serverTrigger)

		expect(serverTrigger).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByRole("textbox", { name: "Host" })).toBeInTheDocument()

		await userEvent.click(databaseTrigger)

		expect(serverTrigger).toHaveAttribute("aria-expanded", "false")
		expect(databaseTrigger).toHaveAttribute("aria-expanded", "true")
		expect(screen.getByRole("textbox", { name: "PostgreSQL URL" })).toBeInTheDocument()
		expect(screen.queryByRole("textbox", { name: "Host" })).not.toBeInTheDocument()
	})

	it("updates environment values and stores secrets in the keychain", async () => {
		setupMocks({
			authenticated: false,
			syncEnabled: true,
			selfHosted: true,
			selfHostedEnvironment: {
				CORTEX_DATABASE_URL: "postgres://old",
			},
		})
		render(<SyncSection view="self-host" />)

		await userEvent.click(screen.getByRole("button", { name: "Database" }))
		fireEvent.change(screen.getByRole("textbox", { name: "PostgreSQL URL" }), {
			target: { value: "postgres://new" },
		})

		await waitFor(() => {
			expect(updateSelfHostedEnvironment).toHaveBeenCalledWith(
				"/vault",
				"CORTEX_DATABASE_URL",
				"postgres://new",
			)
		})

		await userEvent.click(screen.getByRole("button", { name: "Authentication" }))
		fireEvent.change(screen.getByLabelText("Access token secret"), {
			target: { value: "secret-value" },
		})

		await waitFor(() => {
			expect(platformMocks.keychainSet).toHaveBeenCalledWith(
				"sync-env-secret:vault-id:CORTEX_AUTH_ACCESS_TOKEN_SECRET",
				"secret-value",
			)
		})
	})

	it("copies and exports the self-host environment file", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined)
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText },
		})
		setupMocks({ authenticated: false, syncEnabled: true, selfHosted: true })
		render(<SyncSection view="self-host" />)

		await userEvent.click(screen.getByRole("button", { name: "Copy .env" }))

		expect(writeText).toHaveBeenCalledWith(expect.stringContaining("CORTEX_SERVER_HOST=0.0.0.0"))

		await userEvent.click(screen.getByRole("button", { name: "Export" }))

		expect(platformMocks.saveFile).toHaveBeenCalledWith({
			title: "Export sync environment",
			defaultPath: ".env",
			filters: [{ name: "Environment file", extensions: ["env"] }],
		})
		expect(platformMocks.writeFile).toHaveBeenCalledWith(
			"/exports/.env",
			expect.stringContaining("CORTEX_SERVER_HOST=0.0.0.0"),
		)
	})

	it("does not write an environment file when native export is cancelled", async () => {
		platformMocks.saveFile.mockResolvedValueOnce(null)
		setupMocks({ authenticated: false, syncEnabled: true, selfHosted: true })
		render(<SyncSection view="self-host" />)

		await userEvent.click(screen.getByRole("button", { name: "Export" }))

		expect(platformMocks.writeFile).not.toHaveBeenCalled()
	})
})
