export interface FileEntry {
	path: string
	name: string
	isDir: boolean
	size?: number
	mtime?: number
}

export interface WatchEvent {
	path: string
	kind: "created" | "modified" | "deleted" | "renamed"
}

export interface FileSystem {
	readFile(path: string): Promise<string>
	writeFile(path: string, content: string): Promise<void>
	writeBinaryFile(path: string, data: number[]): Promise<void>
	deleteFile(path: string): Promise<void>
	renameFile(oldPath: string, newPath: string): Promise<void>
	createDir(path: string): Promise<void>
	listDir(path: string): Promise<FileEntry[]>
	hashFile(path: string): Promise<string>
	startWatching(path: string, callback: (event: WatchEvent) => void): Promise<() => void>
	downloadFile(url: string, destPath: string): Promise<void>
	downloadAndExtract(url: string, destDir: string): Promise<void>
}
