import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
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

import { useUIStore, useVaultStore } from "@cortex/core"
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

const generalSettings: GeneralSettings = {
	autoOpenLastVault: true,
}

const editorSettings: EditorSettings = {
	tabSize: 4,
	useSpaces: false,
	wordWrap: true,
	showLineNumbers: true,
	autoSave: true,
	autoSaveInterval: 2,
	imageStorageLocation: "same",
	imageStorageCustomPath: "",
}

function setupCoreStores() {
	vi.mocked(useUIStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = { openMarketplace }
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
		expect(screen.getByRole("switch", { name: "Open last vault on startup" })).toBeInTheDocument()
		expect(screen.getByText("Vaults")).toBeInTheDocument()
		expect(screen.getByText("No recent vaults")).toBeInTheDocument()
	})

	it("renders Editor settings with standardized form labels", () => {
		render(<EditorSection settings={editorSettings} onUpdate={onUpdate} />)

		expect(screen.getByText("Indentation")).toBeInTheDocument()
		expect(screen.getByLabelText("Tab size")).toBeInTheDocument()
		expect(screen.getByRole("switch", { name: "Use spaces instead of tabs" })).toBeInTheDocument()
		expect(screen.getByText("Editor behavior")).toBeInTheDocument()
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
