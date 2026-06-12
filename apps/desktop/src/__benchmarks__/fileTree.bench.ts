import { bench } from "vitest"
import { buildFileTree, flattenVisibleFileTree } from "../features/file-explorer/fileTree"

function createEntries(fileCount: number) {
	const directoryCount = Math.ceil(fileCount / 100)
	return [
		...Array.from({ length: directoryCount }, (_, index) => ({
			path: `/vault/folder-${index}`,
			name: `folder-${index}`,
			isDir: true,
		})),
		...Array.from({ length: fileCount }, (_, index) => ({
			path: `/vault/folder-${Math.floor(index / 100)}/note-${index}.md`,
			name: `note-${index}.md`,
			isDir: false,
		})),
	]
}

for (const fileCount of [10_000, 50_000]) {
	const entries = createEntries(fileCount)
	bench(
		`File Explorer ${fileCount} entries`,
		() => {
			const tree = buildFileTree(entries, "/vault")
			const expanded = new Set(tree.slice(0, 20).map((node) => node.path))
			flattenVisibleFileTree(tree, expanded, null, null)
		},
		{ iterations: 20 },
	)
}
