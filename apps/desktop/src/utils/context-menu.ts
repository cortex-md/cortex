import { LogicalPosition } from "@tauri-apps/api/dpi"
import {
	CheckMenuItem,
	Menu,
	MenuItem as NativeMenuItem,
	PredefinedMenuItem,
} from "@tauri-apps/api/menu"

export type MenuItemType = "normal" | "separator" | "checkbox" | "submenu"

export type MenuItem = NormalMenuItem | SeparatorMenuItem | CheckboxMenuItem | SubmenuMenuItem

export interface MenuItemBase {
	id: string
	text: string
	enabled?: boolean
	accelerator?: string
}

export interface NormalMenuItem extends MenuItemBase {
	type?: "normal"
	action?: () => void | Promise<void>
}

export interface SeparatorMenuItem {
	type: "separator"
}

export interface CheckboxMenuItem extends MenuItemBase {
	type: "checkbox"
	checked: boolean
	action?: () => void | Promise<void>
}

export interface SubmenuMenuItem extends MenuItemBase {
	type: "submenu"
	/** Submenu items */
	items: MenuItem[]
}

export interface MenuPosition {
	x: number
	y: number
}

export interface ContextMenuOptions {
	items: MenuItem[]
	position?: MenuPosition
}

export class NativeMenuActions {
	private isShowingMenu = false

	async showContextMenu(options: ContextMenuOptions): Promise<void> {
		if (this.isShowingMenu) {
			return
		}

		this.isShowingMenu = true

		try {
			const menuItems = await this.buildMenuItems(options.items)

			const menu = await Menu.new({
				items: menuItems,
			})

			if (options.position) {
				await menu.popup(new LogicalPosition(options.position.x, options.position.y))
			} else {
				await menu.popup()
			}
		} finally {
			this.isShowingMenu = false
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: Tauri menu API returns heterogeneous item types
	private async buildMenuItems(items: MenuItem[]): Promise<any[]> {
		// biome-ignore lint/suspicious/noExplicitAny: Tauri menu API returns heterogeneous item types
		const result: any[] = []

		for (const item of items) {
			if (item.type === "separator") {
				result.push(await PredefinedMenuItem.new({ item: "Separator" }))
			} else if (item.type === "checkbox") {
				result.push(await this.buildCheckMenuItem(item))
			} else if (item.type === "submenu") {
				result.push(await this.buildSubmenu(item))
			} else {
				// Normal item
				result.push(await this.buildMenuItem(item as NormalMenuItem))
			}
		}

		return result
	}

	private async buildMenuItem(item: NormalMenuItem): Promise<NativeMenuItem> {
		return NativeMenuItem.new({
			id: item.id,
			text: item.text,
			enabled: item.enabled !== false,
			accelerator: item.accelerator,
			action: item.action
				? () => {
						item.action?.()
					}
				: undefined,
		})
	}

	private async buildCheckMenuItem(item: CheckboxMenuItem): Promise<CheckMenuItem> {
		return CheckMenuItem.new({
			id: item.id,
			text: item.text,
			enabled: item.enabled !== false,
			checked: item.checked,
			accelerator: item.accelerator,
			action: item.action
				? () => {
						item.action?.()
					}
				: undefined,
		})
	}

	// biome-ignore lint/suspicious/noExplicitAny: Tauri Submenu type from dynamic import
	private async buildSubmenu(item: SubmenuMenuItem): Promise<any> {
		const { Submenu } = await import("@tauri-apps/api/menu")

		const submenuItems = await this.buildMenuItems(item.items)

		return Submenu.new({
			id: item.id,
			text: item.text,
			enabled: item.enabled !== false,
			items: submenuItems,
		})
	}
}
