import { getPlatform } from "@cortex/platform"
import type { GitHubRelease, RegistryEntry } from "./types"

const REGISTRY_BASE = "https://raw.githubusercontent.com/cortex-md/registry/main"

let cachedPlugins: RegistryEntry[] | null = null
let cachedThemes: RegistryEntry[] | null = null
const cachedMinVersions: Record<string, string | null> = {}

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

export async function fetchManifestMinVersion(repo: string): Promise<string | null> {
	if (repo in cachedMinVersions) return cachedMinVersions[repo]

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
