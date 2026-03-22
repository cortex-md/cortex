import type { FileEntry, FileSystem as IFileSystem, WatchEvent } from "@cortex/platform"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

export class FileSystem implements IFileSystem {
	async readFile(path: string): Promise<string> {
		return await invoke<string>("read_file", { path })
	}

	async writeFile(path: string, content: string): Promise<void> {
		await invoke<void>("write_file", { path, content })
	}

	async writeBinaryFile(path: string, data: number[]): Promise<void> {
		await invoke<void>("write_binary_file", { path, data })
	}

	async deleteFile(path: string): Promise<void> {
		await invoke<void>("delete_file", { path })
	}

	async renameFile(oldPath: string, newPath: string): Promise<void> {
		await invoke<void>("rename_file", { oldPath, newPath })
	}

	async createDir(path: string): Promise<void> {
		await invoke<void>("create_dir", { path })
	}

	async listDir(path: string): Promise<FileEntry[]> {
		return await invoke<FileEntry[]>("list_dir", { path })
	}

	async hashFile(path: string): Promise<string> {
		return await invoke<string>("hash_file", { path })
	}

	async startWatching(path: string, callback: (event: WatchEvent) => void): Promise<() => void> {
		await invoke<void>("start_watching", { path })
		const unlisten = await listen<WatchEvent>("vault-file-changed", (e) => {
			callback(e.payload)
		})
		return async () => {
			unlisten()
			await invoke<void>("stop_watching")
		}
	}

	async downloadAndExtract(url: string, destDir: string): Promise<void> {
		await invoke<void>("download_and_extract", { url, destDir })
	}
}
