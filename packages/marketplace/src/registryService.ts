import { getPlatform } from "@cortex/platform"
import type { GitHubRelease, RegistryEntry } from "./types"

const REGISTRY_BASE = "https://raw.githubusercontent.com/cortex-md/registry/main"

let cachedPlugins: RegistryEntry[] | null = null
let cachedThemes: RegistryEntry[] | null = null

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

export async function fetchReadme(repo: string): Promise<string> {
	for (const branch of ["main", "master"]) {
		const response = await getPlatform().http.fetch(
			`https://raw.githubusercontent.com/${repo}/${branch}/README.md`,
		)
		if (response.ok) return response.text()
	}
	throw new Error(`README not found for ${repo}`)
}
