declare var console: {
	log(...args: unknown[]): void
	warn(...args: unknown[]): void
	error(...args: unknown[]): void
	info(...args: unknown[]): void
	debug(...args: unknown[]): void
}

declare function setTimeout(callback: () => void, ms?: number): number
declare function clearTimeout(id: number): void
declare function setInterval(callback: () => void, ms?: number): number
declare function clearInterval(id: number): void
declare function fetch(
	input: string,
	init?: {
		method?: string
		headers?: Record<string, string>
		body?: string
	},
): Promise<{
	ok: boolean
	status: number
	json(): Promise<unknown>
	text(): Promise<string>
}>
