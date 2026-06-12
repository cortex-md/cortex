import type { FileEntry } from "@cortex/platform"

export interface FileTreeNode {
	name: string
	path: string
	isDir: boolean
	children: FileTreeNode[]
}

export interface FileTreeNodeRow {
	kind: "node"
	node: FileTreeNode
	depth: number
}

export interface FileTreeCreateRow {
	kind: "create"
	parentPath: string
	depth: number
	createType: "file" | "folder"
}

export type FileTreeRow = FileTreeNodeRow | FileTreeCreateRow

function getParentPath(path: string): string {
	return path.slice(0, path.lastIndexOf("/"))
}

function sortNodes(nodes: FileTreeNode[]): void {
	nodes.sort((left, right) => {
		if (left.isDir !== right.isDir) return left.isDir ? -1 : 1
		return left.name.localeCompare(right.name)
	})
}

export function buildFileTree(entries: readonly FileEntry[], rootPath: string): FileTreeNode[] {
	const nodesByPath = new Map<string, FileTreeNode>()
	const childrenByParent = new Map<string, FileTreeNode[]>()

	for (const entry of entries) {
		const node: FileTreeNode = {
			name: entry.name,
			path: entry.path,
			isDir: entry.isDir,
			children: [],
		}
		nodesByPath.set(entry.path, node)
		const parentPath = getParentPath(entry.path)
		const siblings = childrenByParent.get(parentPath)
		if (siblings) siblings.push(node)
		else childrenByParent.set(parentPath, [node])
	}

	for (const node of nodesByPath.values()) {
		if (!node.isDir) continue
		node.children = childrenByParent.get(node.path) ?? []
		sortNodes(node.children)
	}

	const roots = childrenByParent.get(rootPath) ?? []
	sortNodes(roots)
	return roots
}

export function flattenVisibleFileTree(
	nodes: readonly FileTreeNode[],
	expanded: ReadonlySet<string>,
	creatingIn: string | null,
	creatingType: "file" | "folder" | null,
	depth = 0,
): FileTreeRow[] {
	const rows: FileTreeRow[] = []
	for (const node of nodes) {
		rows.push({ kind: "node", node, depth })
		if (!node.isDir || !expanded.has(node.path)) continue
		if (creatingIn === node.path && creatingType) {
			rows.push({
				kind: "create",
				parentPath: node.path,
				depth: depth + 1,
				createType: creatingType,
			})
		}
		rows.push(
			...flattenVisibleFileTree(node.children, expanded, creatingIn, creatingType, depth + 1),
		)
	}
	return rows
}
