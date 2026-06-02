import type { NativeContextMenuOptions, NativeMenuItem, NativeMenuPosition } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"

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

export interface MenuPosition extends NativeMenuPosition {}

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
			const nativeOptions: NativeContextMenuOptions = {
				items: this.serializeItems(options.items),
				position: options.position,
			}
			const selectedId = await getPlatform().menu.showContextMenu(nativeOptions)
			if (!selectedId) return

			const selected = this.findItem(options.items, selectedId)
			await selected?.action?.()
		} finally {
			this.isShowingMenu = false
		}
	}

	private serializeItems(items: MenuItem[]): NativeMenuItem[] {
		return items.map((item) => {
			if (item.type === "separator") return { type: "separator" }
			if (item.type === "submenu") {
				return {
					id: item.id,
					type: "submenu",
					text: item.text,
					enabled: item.enabled,
					accelerator: item.accelerator,
					items: this.serializeItems(item.items),
				}
			}
			if (item.type === "checkbox") {
				return {
					id: item.id,
					type: "checkbox",
					text: item.text,
					enabled: item.enabled,
					accelerator: item.accelerator,
					checked: item.checked,
				}
			}
			return {
				id: item.id,
				type: item.type,
				text: item.text,
				enabled: item.enabled,
				accelerator: item.accelerator,
			}
		})
	}

	private findItem(
		items: MenuItem[],
		selectedId: string,
	): NormalMenuItem | CheckboxMenuItem | null {
		for (const item of items) {
			if (item.type === "separator") continue
			if (item.id === selectedId && item.type !== "submenu") return item
			if (item.type === "submenu") {
				const child = this.findItem(item.items, selectedId)
				if (child) return child
			}
		}

		return null
	}
}
