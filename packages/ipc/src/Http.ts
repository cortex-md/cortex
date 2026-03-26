import type { Http as IHttp } from "@cortex/platform"

export class Http implements IHttp {
	async fetch(url: string, options?: RequestInit): Promise<Response> {
		return window.fetch(url, options)
	}

	async download(url: string): Promise<string> {
		const response = await this.fetch(url)
		if (!response.ok) {
			throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
		}
		return response.text()
	}
}
