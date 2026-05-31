import { getPlatform } from "@cortex/platform"
import type { GitHubRelease, RegistryEntry } from "./types"

const REGISTRY_BASE = "https://raw.githubusercontent.com/cortex-md/registry/main"

let cachedPlugins: RegistryEntry[] | null = null
let cachedThemes: RegistryEntry[] | null = null
const cachedMinVersions: Record<string, string | null> = {}

interface ReleaseManifestResult {
	found: boolean
	minVersion: string | null
}

export async function fetchPluginRegistry(): Promise<RegistryEntry[]> {
	if (cachedPlugins) return cachedPlugins
	const response = await getPlatform().http.fetch(`${REGISTRY_BASE}/plugins.json`)
	if (!response.ok) throw new Error(`Failed to fetch plugin registry: ${response.status}`)
	cachedPlugins = (await response.json()) as RegistryEntry[]
	return cachedPlugins
}

export async function fetchThemeRegistry(): Promise<RegistryEntry[]> {
	if (cachedThemes) return cachedThemes
	const response = await getPlatform().http.fetch(`${REGISTRY_BASE}/themes.json`)
	if (!response.ok) throw new Error(`Failed to fetch theme registry: ${response.status}`)
	cachedThemes = (await response.json()) as RegistryEntry[]
	return cachedThemes
}

export function invalidateRegistryCache(): void {
	cachedPlugins = null
	cachedThemes = null
	for (const repo of Object.keys(cachedMinVersions)) {
		delete cachedMinVersions[repo]
	}
}

export async function fetchLatestRelease(repo: string): Promise<GitHubRelease> {
	const response = await getPlatform().http.fetch(
		`https://api.github.com/repos/${repo}/releases/latest`,
		{ headers: { Accept: "application/vnd.github+json" } },
	)
	if (!response.ok) throw new Error(`Failed to fetch release for ${repo}: ${response.status}`)
	return (await response.json()) as GitHubRelease
}

async function fetchGitHubRaw(repo: string, filename: string): Promise<Response | null> {
	for (const branch of ["main", "master"]) {
		const response = await getPlatform().http.fetch(
			`https://raw.githubusercontent.com/${repo}/${branch}/${filename}`,
		)
		if (response.ok) return response
	}
	return null
}

export async function fetchReadme(repo: string): Promise<string> {
	const response = await fetchGitHubRaw(repo, "README.md")
	if (response) return response.text()
	throw new Error(`README not found for ${repo}`)
}

async function fetchReleaseManifestMinVersion(repo: string): Promise<ReleaseManifestResult> {
	let manifestAsset: GitHubRelease["assets"][number] | undefined
	try {
		const release = await fetchLatestRelease(repo)
		manifestAsset = release.assets.find((asset) => asset.name === "manifest.json")
	} catch {
		return { found: false, minVersion: null }
	}
	if (!manifestAsset) return { found: false, minVersion: null }

	try {
		const manifestContent = await getPlatform().http.download(manifestAsset.browser_download_url)
		const manifest = JSON.parse(manifestContent) as { minAppVersion?: unknown }
		return {
			found: true,
			minVersion: typeof manifest.minAppVersion === "string" ? manifest.minAppVersion : null,
		}
	} catch {
		return { found: true, minVersion: null }
	}
}

export async function fetchManifestMinVersion(repo: string): Promise<string | null> {
	if (repo in cachedMinVersions) return cachedMinVersions[repo]

	const releaseManifest = await fetchReleaseManifestMinVersion(repo)
	if (releaseManifest.found) {
		cachedMinVersions[repo] = releaseManifest.minVersion
		return releaseManifest.minVersion
	}

	const response = await fetchGitHubRaw(repo, "manifest.json")
	if (response) {
		const manifest = (await response.json()) as { minAppVersion?: string }
		const minVersion = manifest.minAppVersion ?? null
		cachedMinVersions[repo] = minVersion
		return minVersion
	}

	cachedMinVersions[repo] = null
	return null
}
