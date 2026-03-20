import { getPlatform } from "@cortex/platform"
import type { PluginAPI } from "cortex-plugin-api"

function validateFilename(filename: string): void {
	if (filename.includes("..") || filename.startsWith("/") || filename.startsWith("\\")) {
		throw new Error(`Invalid data filename: ${filename}`)
	}
}

export function createDataAPI(
	pluginId: string,
	getVaultPath: () => string | null,
): PluginAPI["data"] {
	function dataDir(): string | null {
		const vaultPath = getVaultPath()
		if (!vaultPath) return null
		return `${vaultPath}/.cortex/plugins/${pluginId}/data`
	}

	return {
		async read(filename: string): Promise<string | null> {
			validateFilename(filename)
			const dir = dataDir()
			if (!dir) return null
			try {
				return await getPlatform().fs.readFile(`${dir}/${filename}`)
			} catch {
				return null
			}
		},

		async write(filename: string, content: string): Promise<void> {
			validateFilename(filename)
			const dir = dataDir()
			if (!dir) return
			const platform = getPlatform()
			try {
				await platform.fs.createDir(dir)
			} catch {}
			await platform.fs.writeFile(`${dir}/${filename}`, content)
		},

		async delete(filename: string): Promise<void> {
			validateFilename(filename)
			const dir = dataDir()
			if (!dir) return
			try {
				await getPlatform().fs.deleteFile(`${dir}/${filename}`)
			} catch {}
		},

		getDataPath(): string {
			const dir = dataDir()
			if (!dir) return ""
			return dir
		},
	}
}
