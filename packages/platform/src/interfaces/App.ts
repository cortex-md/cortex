export interface App {
	getCurrentAppVersion: () => Promise<string>
	openExternalUrl: (url: string) => Promise<void>
}
