import { vi } from "vitest"

vi.mock("@cortex/platform", () => ({
	getPlatform: vi.fn(() => ({
		fs: {
			readFile: vi.fn().mockResolvedValue(""),
			writeFile: vi.fn().mockResolvedValue(undefined),
			hashFile: vi.fn().mockResolvedValue("abc123"),
			deleteFile: vi.fn().mockResolvedValue(undefined),
			createFolder: vi.fn().mockResolvedValue(undefined),
			startWatching: vi.fn().mockResolvedValue(() => {}),
		},
		storage: {
			getAppDataDir: vi.fn().mockResolvedValue("/mock"),
			getVaultConfigDir: vi.fn().mockResolvedValue("/mock/.cortex"),
		},
		vault: {
			openVault: vi.fn(),
			closeVault: vi.fn(),
			scanVault: vi.fn().mockResolvedValue([]),
			updateVaultRegistry: vi.fn(),
		},
	})),
	initPlatform: vi.fn(),
}))
