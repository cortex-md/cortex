import "@testing-library/jest-dom"
import { vi } from "vitest"

class MockResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver)
Element.prototype.scrollIntoView = vi.fn()

vi.mock("@cortex/platform", () => ({
	getPlatform: vi.fn(() => ({
		fs: {
			readFile: vi.fn().mockResolvedValue(""),
			writeFile: vi.fn().mockResolvedValue(undefined),
			hashFile: vi.fn().mockResolvedValue("abc123"),
		},
		storage: {
			getAppDataDir: vi.fn().mockResolvedValue("/mock"),
			getVaultConfigDir: vi.fn().mockResolvedValue("/mock/.cortex"),
		},
		notifications: {
			getCapabilities: vi.fn(() => ({
				supported: true,
				icons: false,
				sounds: true,
				actions: false,
			})),
			getPermission: vi.fn().mockResolvedValue("granted"),
			requestPermission: vi.fn().mockResolvedValue("granted"),
			send: vi.fn().mockResolvedValue({ delivered: true }),
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
		menu: {
			showContextMenu: vi.fn().mockResolvedValue(null),
		},
		capabilities: ["notifications"],
	})),
	initPlatform: vi.fn(),
}))

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
}))

vi.mock("@tauri-apps/api/event", () => ({
	listen: vi.fn().mockResolvedValue(() => {}),
	emit: vi.fn(),
}))
