export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export async function apiFetch<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; status: number }> {
	try {
		const url = `${API_BASE_URL}${endpoint}`
		const headers = {
			"Content-Type": "application/json",
			...options.headers,
		}

		const response = await fetch(url, {
			...options,
			headers,
		})

		const status = response.status
		let data = null
		let error = null

		try {
			const json = await response.json()
			if (response.ok) {
				data = json
			} else {
				error = json.error?.message || json.message || "An error occurred"
			}
		} catch (e) {
			if (!response.ok) {
				error = response.statusText || "An error occurred"
			}
		}

		return { data, error, status }
	} catch (error) {
		console.error(error)
		return {
			data: null,
			error: error instanceof Error ? error.message : "Network error",
			status: 0,
		}
	}
}
