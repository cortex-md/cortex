import "@testing-library/jest-dom"
import { vi } from "vitest"

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
