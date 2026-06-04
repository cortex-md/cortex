import type { DeviceEntry } from "@cortex/platform"
import { getPlatform } from "@cortex/platform"
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { immer } from "zustand/middleware/immer"

export interface DevicesState {
	deviceEntries: DeviceEntry[]
	loading: boolean
	error: string | null

	fetchDevices: () => Promise<void>
	renameDevice: (deviceId: string, deviceName: string) => Promise<void>
	revokeDevice: (deviceId: string) => Promise<void>
	clearError: () => void
}

async function syncAuthContext(): Promise<void> {
	const { useRemoteVaultStore } = await import("./remoteVaultStore")
	const { useAuthStore } = await import("./authStore")
	const serverUrl = useRemoteVaultStore.getState().syncConfig.serverUrl
	await useAuthStore.getState().checkAuth(serverUrl ?? undefined)
}

export const useDevicesStore = create<DevicesState>()(
	devtools(
		immer((set) => ({
			deviceEntries: [],
			loading: false,
			error: null,

			fetchDevices: async () => {
				set((state) => {
					state.loading = true
					state.error = null
				})
				try {
					const platform = getPlatform()
					await syncAuthContext()
					const devices = await platform.devices.list()
					set((state) => {
						state.deviceEntries = devices
						state.loading = false
					})
				} catch (e) {
					set((state) => {
						state.loading = false
						state.error = String(e)
					})
				}
			},

			renameDevice: async (deviceId, deviceName) => {
				const platform = getPlatform()
				await syncAuthContext()
				const updated = await platform.devices.rename(deviceId, deviceName)
				set((state) => {
					const index = state.deviceEntries.findIndex((d) => d.id === deviceId)
					if (index !== -1) {
						state.deviceEntries[index] = updated
					}
				})
			},

			revokeDevice: async (deviceId) => {
				const platform = getPlatform()
				await syncAuthContext()
				await platform.devices.revoke(deviceId)
				set((state) => {
					state.deviceEntries = state.deviceEntries.filter((d) => d.id !== deviceId)
				})
			},

			clearError: () =>
				set((state) => {
					state.error = null
				}),
		})),
		{ name: "devicesStore" },
	),
)
