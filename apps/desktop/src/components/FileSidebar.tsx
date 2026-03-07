import { useVaultStore, useWorkspaceStore } from "@cortex/core"
import type { FileEntry } from "@cortex/platform"
import { Button } from "@cortex/ui"
import { ChevronRightIcon } from "lucide-react"
import { useState } from "react"

interface TreeNode {
	name: string
	path: string
	isDir: boolean
	children: TreeNode[]
}

function buildTree(entries: FileEntry[], parentPath: string): TreeNode[] {
	const sep = "/"
	const children = entries.filter((e) => {
		const parent = e.path.substring(0, e.path.lastIndexOf(sep))
		return parent === parentPath
	})
	children.sort((a, b) => {
		if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
		return a.name.localeCompare(b.name)
	})
	return children.map((e) => ({
		name: e.name,
		path: e.path,
		isDir: e.isDir,
		children: e.isDir ? buildTree(entries, e.path) : [],
	}))
}

interface TreeNodeProps {
	node: TreeNode
	depth: number
	expanded: Set<string>
	onToggle: (path: string) => void
	activeFilePath: string | null
	onOpenFile: (path: string) => void
}

function TreeNodeView({
	node,
	depth,
	expanded,
	onToggle,
	activeFilePath,
	onOpenFile,
}: TreeNodeProps) {
	const isExpanded = expanded.has(node.path)
	const isActive = !node.isDir && activeFilePath === node.path

	return (
		<>
			<Button
				size="sm"
				variant="ghost"
				type="button"
				className={`file-tree-item ${isActive ? "active" : ""}`}
				style={{ paddingLeft: 8 + depth * 16 }}
				onClick={() => (node.isDir ? onToggle(node.path) : onOpenFile(node.path))}
			>
				{node.isDir && (
					<ChevronRightIcon
						size={12}
						strokeWidth={2.5}
						className={`file-tree-chevron ${isExpanded ? "expanded" : ""}`}
					/>
				)}
				<span className="file-tree-name">
					{node.isDir ? node.name : node.name.replace(/\.md$/, "")}
				</span>
			</Button>
			{node.isDir &&
				isExpanded &&
				node.children.map((child) => (
					<TreeNodeView
						key={child.path}
						node={child}
						depth={depth + 1}
						expanded={expanded}
						onToggle={onToggle}
						activeFilePath={activeFilePath}
						onOpenFile={onOpenFile}
					/>
				))}
		</>
	)
}

export function FileSidebar() {
	const { vault, files } = useVaultStore()
	const { openTab, activePaneId, panes } = useWorkspaceStore()
	const [expanded, setExpanded] = useState<Set<string>>(new Set())

	const activePane = panes[activePaneId]
	const activeTab = activePane?.tabs.find((t) => t.id === activePane.activeTabId)

	const handleToggle = (path: string) => {
		setExpanded((prev) => {
			const next = new Set(prev)
			if (next.has(path)) next.delete(path)
			else next.add(path)
			return next
		})
	}

	if (!vault) {
		return
	}

	const tree = buildTree(files, vault.path)

	return (
		<div className="file-sidebar">
			<div className="file-tree">
				{tree.length === 0 ? (
					<div className="sidebar-no-files">No files</div>
				) : (
					tree.map((node) => (
						<TreeNodeView
							key={node.path}
							node={node}
							depth={0}
							expanded={expanded}
							onToggle={handleToggle}
							activeFilePath={activeTab?.filePath ?? null}
							onOpenFile={openTab}
						/>
					))
				)}
			</div>
		</div>
	)
}
