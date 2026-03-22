export interface RegistryEntry {
	id: string
	name: string
	author: string
	description: string
	coverImageUrl: string
	repo: string
}

export interface GitHubRelease {
	tag_name: string
	assets: GitHubReleaseAsset[]
	zipball_url: string
}

export interface GitHubReleaseAsset {
	name: string
	browser_download_url: string
}
