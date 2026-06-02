export type NativeMenuItemType = "normal" | "separator" | "checkbox" | "submenu"

export interface NativeMenuItemBase {
	id: string
	text: string
	enabled?: boolean
	accelerator?: string
}

export interface NativeNormalMenuItem extends NativeMenuItemBase {
	type?: "normal"
}

export interface NativeSeparatorMenuItem {
	type: "separator"
}

export interface NativeCheckboxMenuItem extends NativeMenuItemBase {
	type: "checkbox"
	checked: boolean
}

export interface NativeSubmenuMenuItem extends NativeMenuItemBase {
	type: "submenu"
	items: NativeMenuItem[]
}

export type NativeMenuItem =
	| NativeNormalMenuItem
	| NativeSeparatorMenuItem
	| NativeCheckboxMenuItem
	| NativeSubmenuMenuItem

export interface NativeMenuPosition {
	x: number
	y: number
}

export interface NativeContextMenuOptions {
	items: NativeMenuItem[]
	position?: NativeMenuPosition
}

export interface Menu {
	showContextMenu(options: NativeContextMenuOptions): Promise<string | null>
}
