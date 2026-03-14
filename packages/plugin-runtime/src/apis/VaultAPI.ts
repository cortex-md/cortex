import { getPlatform } from "@cortex/platform"
import type { Disposable, PluginAPI, VaultFileEvent } from "@cortex/plugin-api"

function validateRelativePath(relativePath: string): void {
	if (
		relativePath.includes("..") ||
		relativePath.startsWith("/") ||
		relativePath.startsWith("\\")
	) {
		throw new Error(`Path must be relative to vault root: ${relativePath}`)
	}
}

export function createVaultAPI(getVaultPath: () => string | null): PluginAPI["vault"] {
	const fileEventListeners = new Set<(event: VaultFileEvent) => void>()

	function resolvePath(relativePath: string): string {
		validateRelativePath(relativePath)
		const vaultPath = getVaultPath()
		if (!vaultPath) throw new Error("No vault is open")
		return `${vaultPath}/${relativePath}`
	}

	return {
		getVaultPath,

		async readFile(relativePath: string): Promise<string> {
			return getPlatform().fs.readFile(resolvePath(relativePath))
		},

		async writeFile(relativePath: string, content: string): Promise<void> {
			await getPlatform().fs.writeFile(resolvePath(relativePath), content)
		},

		async deleteFile(relativePath: string): Promise<void> {
			await getPlatform().fs.deleteFile(resolvePath(relativePath))
		},

		async listFiles(dir?: string) {
			const fullPath = dir ? resolvePath(dir) : getVaultPath()
			if (!fullPath) throw new Error("No vault is open")
			return getPlatform().fs.listDir(fullPath)
		},

		async exists(relativePath: string): Promise<boolean> {
			try {
				await getPlatform().fs.readFile(resolvePath(relativePath))
				return true
			} catch {
				return false
			}
		},

		onFileEvent(callback: (event: VaultFileEvent) => void): Disposable {
			fileEventListeners.add(callback)
			return {
				dispose() {
					fileEventListeners.delete(callback)
				},
			}
		},
	}
}
