export interface Dialog {
	pickFolder(title?: string): Promise<string | null>
	showConfirm(title: string, message: string): Promise<boolean>
	showAlert(title: string, message: string): Promise<void>
	revealFolder(path: string): Promise<void>
}
