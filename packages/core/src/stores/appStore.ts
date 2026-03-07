import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface AppState {
	version: string | null

	loadAppInfo: () => Promise<void>
}

export const useAppStore = create<AppState>()(
	devtools(
		immer((set) => ({
			version: null,

			loadAppInfo: async () => {
				const version = await getPlatform().app.getCurrentAppVersion()
				set((state) => {
					state.version = version
				})
			},
		})),
		{ name: "appStore" },
	),
)
