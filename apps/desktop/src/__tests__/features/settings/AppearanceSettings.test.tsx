import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useUIStore: vi.fn(),
}))

import { useUIStore } from "@cortex/core"
import { getPlatform } from "@cortex/platform"
import type { AppearanceSettings } from "@cortex/settings"
import { getThemeManager } from "@cortex/theme"
import { AppearanceSection } from "../../../features/settings/AppearanceSettings"

const openMarketplace = vi.fn()
const onUpdate = vi.fn()

const appearanceSettings: AppearanceSettings = {
	theme: "default",
	colorscheme: "system",
	accentColor: "#e8a83c",
	uiFontFamily: "System Default",
	uiFontSize: 14,
	editorFontFamily: "System Default",
	editorFontSize: 16,
	lineHeight: 1.5,
}

function setupAppearance() {
	vi.mocked(useUIStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = { openMarketplace }
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(getPlatform).mockReturnValue({
		font: {
			listSystemFonts: vi.fn().mockResolvedValue([{ family: "Inter" }]),
		},
		appearance: {
			getSnapshot: vi.fn().mockResolvedValue({
				platform: "macos",
				colorScheme: "light",
				reducedMotion: false,
				highContrast: false,
				accentColor: "#0a84ff",
				scrollbarStyle: "overlay",
			}),
			subscribe: vi.fn(() => () => {}),
		},
	} as never)
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("AppearanceSection", () => {
	it("uses theme swatches and custom color updates for accent color", async () => {
		setupAppearance()
		const themeManager = getThemeManager()
		const applyOverrides = vi.spyOn(themeManager, "applyOverrides")

		render(<AppearanceSection settings={appearanceSettings} onUpdate={onUpdate} />)

		const successSwatch = await screen.findByRole("button", {
			name: "Success (#4a9b6f)",
		})
		await userEvent.click(successSwatch)

		expect(onUpdate).toHaveBeenCalledWith("appearance", "accentColor", "#4a9b6f")
		expect(applyOverrides).toHaveBeenCalled()

		fireEvent.change(screen.getByLabelText("Accent Color"), {
			target: { value: "#3b82f6" },
		})

		await waitFor(() => {
			expect(onUpdate).toHaveBeenCalledWith("appearance", "accentColor", "#3b82f6")
		})
	})
})
