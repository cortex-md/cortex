import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useAuthStore: vi.fn(),
	useRemoteVaultStore: vi.fn(),
	useSyncStore: vi.fn(),
	useUIStore: vi.fn(),
	useVaultStore: vi.fn(),
}))

vi.mock("../../../features/sync/DeviceManager", () => ({
	DeviceManager: () => <div>Device manager panel</div>,
}))
vi.mock("../../../features/sync/InvitesPanel", () => ({
	InvitesPanel: () => <div>Invites panel</div>,
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
const loadLink = vi.fn().mockResolvedValue(undefined)
const fetchRemoteVaults = vi.fn().mockResolvedValue(undefined)
const updateSyncPreference = vi.fn().mockResolvedValue(undefined)

function setupMocks(
	overrides: {
		authenticated?: boolean
		user?: { userId: string; email: string } | null
		syncEnabled?: boolean
		selfHosted?: boolean
		linkedVaultId?: string | null
		remoteVaults?: Array<{ id: string; role: string }>
	} = {},
) {
	vi.mocked(useUIStore).mockImplementation(((selector?: (s: unknown) => unknown) => {
		const state = { closeSettings, openAuth }
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useAuthStore).mockImplementation(((selector?: (s: unknown) => unknown) => {
		const authenticated = overrides.authenticated ?? false
		const state = {
			authenticated,
			syncEnabled: overrides.syncEnabled ?? false,
			selfHosted: overrides.selfHosted ?? false,
			user:
				overrides.user ?? (authenticated ? { userId: "user-id", email: "you@example.com" } : null),
			logout,
			setSyncEnabled,
			serverUrl: "https://sync.example.com",
			saveServerUrl,
			setSelfHosted,
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useVaultStore).mockImplementation(((selector?: (s: unknown) => unknown) => {
		const state = { vault: mockVault }
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useRemoteVaultStore).mockReturnValue({
		linkedVaultId: overrides.linkedVaultId ?? null,
		remoteVaults: overrides.remoteVaults ?? [],
		loadLink,
		fetchRemoteVaults,
	} as never)

	vi.mocked(useSyncStore).mockReturnValue({
		engineState: "idle",
		syncPreferences: {
			syncSettings: false,
			syncHotkeys: false,
			syncWorkspace: false,
			syncPluginMetadata: false,
			syncThemeMetadata: false,
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
	it("shows only a sign-in alert when signed out", async () => {
		setupMocks({ authenticated: false })
		render(<SyncSection />)

		expect(screen.getByText("Sign in to use sync")).toBeInTheDocument()
		expect(screen.queryByText("Enable sync")).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

		expect(closeSettings).toHaveBeenCalled()
		expect(openAuth).toHaveBeenCalledWith("login", "sync")
	})

	it("shows account and enable sync toggle when signed in but sync is disabled", () => {
		setupMocks({ authenticated: true, syncEnabled: false })
		render(<SyncSection />)

		expect(screen.getByText("you@example.com")).toBeInTheDocument()
		expect(screen.getByText("Enable sync")).toBeInTheDocument()
		expect(screen.queryByText("Vault Link")).not.toBeInTheDocument()
		expect(fetchRemoteVaults).not.toHaveBeenCalled()
	})

	it("shows vault-link onboarding when sync is enabled without a link", async () => {
		setupMocks({ authenticated: true, syncEnabled: true, linkedVaultId: null })
		render(<SyncSection />)

		expect(screen.getByText("Vault Link")).toBeInTheDocument()
		expect(screen.getByText("Link or create a remote vault to start syncing.")).toBeInTheDocument()
		expect(screen.queryByText("Devices")).not.toBeInTheDocument()

		await waitFor(() => {
			expect(fetchRemoteVaults).toHaveBeenCalled()
		})
	})

	it("shows full sync settings after sync is enabled and linked", () => {
		setupMocks({
			authenticated: true,
			syncEnabled: true,
			linkedVaultId: "remote-vault-id",
			remoteVaults: [{ id: "remote-vault-id", role: "owner" }],
		})
		render(<SyncSection />)

		expect(screen.getByText("Linked to remote vault")).toBeInTheDocument()
		expect(screen.getByText("Devices")).toBeInTheDocument()
		expect(screen.getByText("Device manager panel")).toBeInTheDocument()
		expect(screen.getByText("My Invites")).toBeInTheDocument()
		expect(screen.getByText("Invites panel")).toBeInTheDocument()
		expect(screen.getByText("Vault Members & Invites")).toBeInTheDocument()
		expect(screen.getByText("Members panel")).toBeInTheDocument()
		expect(screen.getByText("Sync Preferences")).toBeInTheDocument()
		expect(screen.getByText("Excluded paths panel")).toBeInTheDocument()
		expect(screen.getByText("Server")).toBeInTheDocument()
	})
})
