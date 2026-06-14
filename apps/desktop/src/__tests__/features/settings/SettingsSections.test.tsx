import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useAuthStore: vi.fn(),
	useUIStore: vi.fn(),
	useVaultStore: vi.fn(),
}))

vi.mock("@cortex/plugin-runtime", () => ({
	disablePlugin: vi.fn().mockResolvedValue(undefined),
	enablePlugin: vi.fn().mockResolvedValue(undefined),
	getCommunityPluginsDir: vi.fn(() => "/vault/.cortex/plugins"),
	saveEnabledPlugins: vi.fn().mockResolvedValue(undefined),
	usePluginStore: vi.fn(),
}))

import { useAuthStore, useUIStore, useVaultStore } from "@cortex/core"
import { usePluginStore } from "@cortex/plugin-runtime"
import type { EditorSettings, GeneralSettings } from "@cortex/settings"
import { EditorSection } from "../../../features/settings/EditorSettings"
import { GeneralSection } from "../../../features/settings/GeneralSettings"
import { PluginsSection } from "../../../features/settings/PluginsSettings"
import {
	SettingsField,
	SettingsGroup,
	SettingsPage,
	SettingsSection,
} from "../../../features/settings/SettingsPrimitives"

const onUpdate = vi.fn()
const openMarketplace = vi.fn()
const openAuth = vi.fn()
const logout = vi.fn().mockResolvedValue(undefined)

const generalSettings: GeneralSettings = {
	autoOpenLastVault: true,
}

const editorSettings: EditorSettings = {
	tabSize: 4,
	useSpaces: false,
	wordWrap: true,
	showLineNumbers: true,
	vimMode: false,
	autoSave: true,
	autoSaveInterval: 2,
	imageStorageLocation: "same",
	imageStorageCustomPath: "",
}

function setupCoreStores({ authenticated = false }: { authenticated?: boolean } = {}) {
	vi.mocked(useUIStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = { openMarketplace, openAuth }
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useAuthStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = {
			authenticated,
			user: authenticated
				? {
						userId: "user-id",
						email: "jane.doe@example.com",
						displayName: "Jane Doe",
					}
				: null,
			logout,
			serverUrl: "https://sync.example.com",
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(useVaultStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = {
			vault: { path: "/vault", name: "Vault", uuid: "vault-id" },
			recentVaults: [],
			openVault: vi.fn(),
			closeVault: vi.fn(),
			removeRecentVault: vi.fn(),
		}
		return selector ? selector(state) : state
	}) as never)
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("settings sections", () => {
	it("renders General settings with shared blocks and fields", () => {
		setupCoreStores()
		render(<GeneralSection settings={generalSettings} onUpdate={onUpdate} />)

		expect(screen.getByText("Startup")).toBeInTheDocument()
		expect(screen.getByText("Account")).toBeInTheDocument()
		expect(screen.getByText("No account connected")).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: "Open last vault on startup" })).toBeInTheDocument()
		expect(screen.getByText("Vaults")).toBeInTheDocument()
		expect(screen.getByText("No recent vaults")).toBeInTheDocument()
	})

	it("shows the connected account and signs out from General settings", async () => {
		setupCoreStores({ authenticated: true })
		render(<GeneralSection settings={generalSettings} onUpdate={onUpdate} />)

		expect(screen.getByText("Jane Doe")).toBeInTheDocument()
		expect(screen.getByText("jane.doe@example.com")).toBeInTheDocument()
		expect(screen.getByText("JD")).toBeInTheDocument()
		expect(screen.getByText("Connected to sync.example.com")).toBeInTheDocument()

		await userEvent.click(screen.getByRole("button", { name: "Sign out" }))

		expect(logout).toHaveBeenCalledWith(false, "https://sync.example.com")
	})

	it("opens the account modal from General settings", async () => {
		setupCoreStores()
		render(<GeneralSection settings={generalSettings} onUpdate={onUpdate} />)

		await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

		expect(openAuth).toHaveBeenCalledWith("login", "general")
	})

	it("renders Editor settings with standardized form labels", () => {
		render(<EditorSection settings={editorSettings} onUpdate={onUpdate} />)

		expect(screen.getByText("Indentation")).toBeInTheDocument()
		expect(screen.getByLabelText("Tab size")).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: "Use spaces instead of tabs" })).toBeInTheDocument()
		expect(screen.getByText("Editor behavior")).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: "Vim mode" })).toBeInTheDocument()
		expect(screen.getByText("Images")).toBeInTheDocument()
	})

	it("renders Plugins settings in shared lists", () => {
		setupCoreStores()
		vi.mocked(usePluginStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
			const state = {
				plugins: {
					core: {
						status: "enabled",
						manifest: {
							id: "core",
							name: "Core plugin",
							version: "1.0.0",
							author: "Cortex",
							description: "Built in",
							icon: "Blocks",
						},
					},
					community: {
						status: "disabled",
						manifest: {
							id: "community",
							name: "Community plugin",
							version: "1.0.0",
							author: "Community",
							description: "Installed locally",
							icon: "Blocks",
						},
					},
				},
			}
			return selector ? selector(state) : state
		}) as never)

		render(<PluginsSection />)

		expect(screen.getByText("Core plugins")).toBeInTheDocument()
		expect(screen.getByText("Community plugins")).toBeInTheDocument()
		expect(screen.getByText("Core plugin")).toBeInTheDocument()
		expect(screen.getByText("Community plugin")).toBeInTheDocument()
	})

	it("keeps long field labels and descriptions inside the shared settings layout", () => {
		const { container } = render(
			<SettingsPage>
				<SettingsSection title="Long Content">
					<SettingsGroup>
						<SettingsField
							label="A very long setting label that should remain readable without changing component style"
							description="A long description should stay in the field content column and avoid becoming a one-off text style."
						>
							<div>Control</div>
						</SettingsField>
					</SettingsGroup>
				</SettingsSection>
			</SettingsPage>,
		)

		expect(screen.getByText("Long Content")).toBeInTheDocument()
		expect(screen.getByText(/A very long setting label/)).toBeInTheDocument()
		expect(screen.getByText(/A long description/)).toBeInTheDocument()
		const section = container.querySelector('[data-slot="settings-section"]')
		const group = container.querySelector('[data-slot="settings-group"]')
		const field = container.querySelector('[data-slot="field"]')
		expect(group?.contains(section?.querySelector("h2") ?? null)).toBe(false)
		expect(field).toHaveClass("min-h-14")
	})
})
