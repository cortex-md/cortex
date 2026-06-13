import type { FileEntry } from "@cortex/platform"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { loadCommunityThemes } from "../../../features/themes/communityThemeLoader"

const testState = vi.hoisted(() => ({
	files: new Map<string, string>(),
	registerCommunityFamily: vi.fn(),
	injectCSS: vi.fn(),
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: () => ({
		fs: {
			listDir: vi.fn(
				async (): Promise<FileEntry[]> => [
					{
						name: "quiet-theme",
						path: "/vault/.cortex/themes/quiet-theme",
						isDir: true,
					},
				],
			),
			readFile: vi.fn(async (path: string) => {
				const content = testState.files.get(path)
				if (content === undefined) throw new Error(`Missing file: ${path}`)
				return content
			}),
		},
	}),
}))

vi.mock("@cortex/theme", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@cortex/theme")>()
	return {
		...actual,
		getThemeManager: () => ({
			registerCommunityFamily: testState.registerCommunityFamily,
			injectCSS: testState.injectCSS,
		}),
	}
})

describe("community theme loader", () => {
	beforeEach(() => {
		testState.files.clear()
		testState.registerCommunityFamily.mockClear()
		testState.injectCSS.mockClear()
	})

	it("injects community CSS as opaque browser content", async () => {
		const themesDir = "/vault/.cortex/themes"
		const darkCss =
			'@font-face { font-family: "Quiet"; src: url("./quiet.woff2"); } body { color: red; }'
		const lightCss = "@media (prefers-contrast: more) { * { outline: 1px solid currentColor; } }"
		testState.files.set(
			`${themesDir}/quiet-theme/manifest.json`,
			JSON.stringify({
				id: "quiet-theme",
				name: "quiet-theme",
				displayName: "Quiet Theme",
				author: "Cortex",
				version: "1.0.0",
				colorschemes: {
					dark: "dark.css",
					light: "light.css",
				},
			}),
		)
		testState.files.set(`${themesDir}/quiet-theme/dark.css`, darkCss)
		testState.files.set(`${themesDir}/quiet-theme/light.css`, lightCss)

		await loadCommunityThemes(themesDir)

		expect(testState.registerCommunityFamily).toHaveBeenCalledWith({
			name: "quiet-theme",
			displayName: "Quiet Theme",
			darkTheme: "quiet-theme-dark",
			lightTheme: "quiet-theme-light",
		})
		expect(testState.injectCSS).toHaveBeenNthCalledWith(1, darkCss, "quiet-theme-dark")
		expect(testState.injectCSS).toHaveBeenNthCalledWith(2, lightCss, "quiet-theme-light")
	})
})
