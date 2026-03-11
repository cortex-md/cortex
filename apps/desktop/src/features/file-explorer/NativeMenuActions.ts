import type { MenuItem } from "@/utils/context-menu"

export interface FileContextMenuContext {
	path: string
	fileName: string
	isDirectory: boolean
	selectionCount: number
	isMultiSelect: boolean
}

export interface FileContextMenuActions {
	createFile: (parentPath?: string) => void
	createFolder: (parentPath?: string) => void
	openInNewTab: (path: string) => void
	rename: (path: string) => void
	addBookmark: (path: string, fileName: string) => void
	manageTags?: (path: string) => void
	moveTo?: (path: string) => void
	copyFile?: (path: string) => void
	delete: (path: string, isDirectory: boolean) => void
	copyPath?: (path: string) => void
	copyRelativePath?: (path: string) => void
	showInExplorer?: (path: string) => void
	showVersionHistory?: (path: string) => void
	toggleSyncIgnore?: (path: string, ignored: boolean) => void
	isSyncIgnored?: (path: string) => boolean
}

export function buildFileContextMenuItems(
	ctx: FileContextMenuContext,
	actions: FileContextMenuActions,
): MenuItem[] {
	const { path, fileName, isDirectory, selectionCount, isMultiSelect } = ctx
	const items: MenuItem[] = []

	items.push({
		id: "new-file",
		type: "normal",
		text: "New File",
		action: () => actions.createFile(isDirectory ? path : undefined),
	})
	items.push({
		id: "new-folder",
		type: "normal",
		text: "New Folder",
		action: () => actions.createFolder(isDirectory ? path : undefined),
	})
	items.push({ type: "separator" })

	if (!isDirectory) {
		items.push({
			id: "open-new-tab",
			type: "normal",
			text: "Open in New Tab",
			action: () => actions.openInNewTab(path),
		})
	}

	items.push({
		id: "rename",
		type: "normal",
		text: "Rename",
		action: () => actions.rename(path),
	})

	if (!isDirectory) {
		items.push({
			id: "add-bookmark",
			type: "normal",
			text: "Add to Bookmarks",
			action: () => actions.addBookmark(path, fileName),
		})

		if (actions.manageTags) {
			items.push({
				id: "manage-tags",
				type: "normal",
				text: "Manage Tags",
				action: () => actions.manageTags!(path),
			})
		}
	}

	if (actions.moveTo) {
		items.push({
			id: "move-to",
			type: "normal",
			text: "Move To...",
			action: () => actions.moveTo!(path),
		})
	}

	if (actions.copyFile) {
		items.push({
			id: "copy-file",
			type: "normal",
			text: "Make a Copy",
			action: () => actions.copyFile!(path),
		})
	}

	items.push({
		id: "delete",
		type: "normal",
		text: isMultiSelect ? `Delete (${selectionCount})` : "Delete",
		action: () => actions.delete(path, isDirectory),
	})

	items.push({ type: "separator" })

	if (actions.copyPath) {
		items.push({
			id: "copy-path",
			type: "normal",
			text: "Copy Path",
			action: () => actions.copyPath!(path),
		})
	}

	if (actions.copyRelativePath) {
		items.push({
			id: "copy-relative-path",
			type: "normal",
			text: "Copy Relative Path",
			action: () => actions.copyRelativePath!(path),
		})
	}

	if (actions.showInExplorer) {
		items.push({
			id: "show-in-explorer",
			type: "normal",
			text: "Show in System Explorer",
			action: () => actions.showInExplorer!(path),
		})
	}

	if (!isDirectory && actions.showVersionHistory) {
		items.push({ type: "separator" })
		items.push({
			id: "version-history",
			type: "normal",
			text: "Version History",
			action: () => actions.showVersionHistory!(path),
		})
	}

	if (actions.toggleSyncIgnore && actions.isSyncIgnored) {
		items.push({ type: "separator" })
		if (actions.isSyncIgnored(path)) {
			items.push({
				id: "include-in-sync",
				type: "normal",
				text: "Include in Sync",
				action: () => actions.toggleSyncIgnore!(path, false),
			})
		} else {
			items.push({
				id: "exclude-from-sync",
				type: "normal",
				text: "Exclude from Sync",
				action: () => actions.toggleSyncIgnore!(path, true),
			})
		}
	}

	return items
}

export function buildRootContextMenuItems(
	rootPath: string,
	actions: Pick<FileContextMenuActions, "createFile" | "createFolder">,
): MenuItem[] {
	return [
		{
			id: "new-file",
			type: "normal",
			text: "New File",
			action: () => actions.createFile(rootPath),
		},
		{
			id: "new-folder",
			type: "normal",
			text: "New Folder",
			action: () => actions.createFolder(rootPath),
		},
	]
}
