import { beforeEach, describe, expect, it, vi } from "vitest"
import { fetchManifestMinVersion, invalidateRegistryCache } from "./registryService"

const testState = vi.hoisted(() => ({
	platform: {
		http: {
			fetch: vi.fn(),
			download: vi.fn(),
		},
	},
}))

vi.mock("@cortex/platform", () => ({
	getPlatform: () => testState.platform,
}))

function createJsonResponse(body: unknown, status = 200) {
	return {
		ok: status >= 200 && status < 300,
		status,
		json: vi.fn(async () => body),
		text: vi.fn(async () => JSON.stringify(body)),
	} as unknown as Response
}

function createRelease(repo: string, assets: { name: string; url: string }[]) {
	return {
		tag_name: "v0.1.0",
		published_at: "2026-03-22T23:20:33Z",
		zipball_url: `https://api.github.com/repos/${repo}/zipball/v0.1.0`,
		assets: assets.map((asset) => ({
			name: asset.name,
			browser_download_url: asset.url,
		})),
	}
}

beforeEach(() => {
	invalidateRegistryCache()
	testState.platform.http.fetch.mockReset()
	testState.platform.http.download.mockReset()
})

describe("fetchManifestMinVersion", () => {
	it("reads manifest.json from the latest release asset before trying raw GitHub files", async () => {
		const repo = "furqas/jorge"
		testState.platform.http.fetch.mockResolvedValueOnce(
			createJsonResponse(
				createRelease(repo, [
					{
						name: "manifest.json",
						url: "https://github.com/furqas/jorge/releases/download/v0.1.0/manifest.json",
					},
				]),
			),
		)
		testState.platform.http.download.mockResolvedValueOnce(
			JSON.stringify({ minAppVersion: "0.1.0" }),
		)

		const minVersion = await fetchManifestMinVersion(repo)

		expect(minVersion).toBe("0.1.0")
		expect(testState.platform.http.download).toHaveBeenCalledWith(
			"https://github.com/furqas/jorge/releases/download/v0.1.0/manifest.json",
		)
		expect(testState.platform.http.fetch).toHaveBeenCalledTimes(1)
		expect(testState.platform.http.fetch.mock.calls[0][0]).toBe(
			"https://api.github.com/repos/furqas/jorge/releases/latest",
		)
	})

	it("falls back to raw manifest lookup when the release has no manifest asset", async () => {
		const repo = "owner/source-plugin"
		testState.platform.http.fetch
			.mockResolvedValueOnce(createJsonResponse(createRelease(repo, [])))
			.mockResolvedValueOnce(createJsonResponse({ minAppVersion: "0.2.0" }))

		const minVersion = await fetchManifestMinVersion(repo)

		expect(minVersion).toBe("0.2.0")
		expect(testState.platform.http.download).not.toHaveBeenCalled()
		expect(testState.platform.http.fetch).toHaveBeenNthCalledWith(
			2,
			"https://raw.githubusercontent.com/owner/source-plugin/main/manifest.json",
		)
	})

	it("does not try raw manifest lookup when the release manifest asset is present but unreadable", async () => {
		const repo = "owner/broken-asset-plugin"
		testState.platform.http.fetch.mockResolvedValueOnce(
			createJsonResponse(
				createRelease(repo, [
					{
						name: "manifest.json",
						url: "https://github.com/owner/broken-asset-plugin/releases/download/v0.1.0/manifest.json",
					},
				]),
			),
		)
		testState.platform.http.download.mockRejectedValueOnce(new Error("Download failed: 404"))

		const minVersion = await fetchManifestMinVersion(repo)

		expect(minVersion).toBeNull()
		expect(testState.platform.http.fetch).toHaveBeenCalledTimes(1)
	})
})
