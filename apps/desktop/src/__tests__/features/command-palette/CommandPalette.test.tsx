import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@cortex/core", () => ({
	useUIStore: vi.fn(),
}))

vi.mock("@cortex/hotkeys", () => ({
	formatHotkeyDisplay: vi.fn((keys: string[]) => keys.join("+")),
	useHotkeysStore: vi.fn(),
}))

vi.mock("@cortex/plugin-runtime", () => ({
	getCommands: vi.fn(),
}))

import { useUIStore } from "@cortex/core"
import { useHotkeysStore } from "@cortex/hotkeys"
import { getCommands } from "@cortex/plugin-runtime"
import { CommandPalette } from "../../../features/command-palette/CommandPalette"

const toggleCommandPalette = vi.fn()
const executeCommand = vi.fn()

function setupCommandPalette() {
	vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
		callback(0)
		return 0
	})

	vi.mocked(useUIStore).mockReturnValue({
		commandPaletteOpen: true,
		toggleCommandPalette,
	} as never)

	vi.mocked(useHotkeysStore).mockImplementation(((selector?: (state: unknown) => unknown) => {
		const state = {
			bindings: [{ id: "workspace.open-settings", keys: ["mod", ","] }],
		}
		return selector ? selector(state) : state
	}) as never)

	vi.mocked(getCommands).mockReturnValue([
		{
			id: "workspace.open-settings",
			label: "Open Settings",
			category: "Workspace",
			execute: executeCommand,
		},
	] as never)
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
	vi.unstubAllGlobals()
})

describe("CommandPalette", () => {
	it("executes a command and closes the palette", async () => {
		setupCommandPalette()
		render(<CommandPalette />)

		await userEvent.click(screen.getByText("Open Settings"))

		expect(toggleCommandPalette).toHaveBeenCalled()
		await waitFor(() => {
			expect(executeCommand).toHaveBeenCalled()
		})
		expect(screen.getByText("mod+,")).toBeInTheDocument()
	})
})
